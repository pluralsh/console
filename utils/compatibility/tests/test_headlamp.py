import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
from types import ModuleType
import sys
import unittest
from unittest.mock import Mock, patch
import yaml

spec = importlib.util.spec_from_file_location("headlamp", Path(__file__).parents[1] / "scrapers/headlamp.py")
scraper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scraper)
DOC = "# Headlamp\n\n## Prerequisites\n\n- Kubernetes 1.21+\n- Helm 3.x\n\n## Optional features\nKubernetes >= 1.27 for unhealthyPodEvictionPolicy.\n"


def fixture(chart="0.32.1", app="0.32.0", doc=DOC):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name, text in {"Chart.yaml": yaml.safe_dump({"name":"headlamp", "version":chart, "appVersion":app}), "README.md":doc}.items():
            data = text.encode()
            member = tarfile.TarInfo("headlamp/" + name)
            member.size = len(data)
            archive.addfile(member, io.BytesIO(data))
    payload = buffer.getvalue()
    entry = {"version":chart, "appVersion":app,"digest":hashlib.sha256(payload).hexdigest(),"urls":[f"https://github.com/kubernetes-sigs/headlamp/releases/download/headlamp-helm-{chart}/headlamp-{chart}.tgz"]}
    return entry, payload


def index(*entries):
    return yaml.safe_dump({"entries":{"headlamp":list(entries)}})


class HeadlampTests(unittest.TestCase):
    def test_uses_prerequisite_not_optional_feature(self):
        self.assertEqual(scraper.parse_minimum(DOC), "1.21")

    def test_missing_or_ambiguous_prerequisite_rejected(self):
        for doc in ["Kubernetes 1.21+", DOC.replace("- Kubernetes 1.21+", ""), DOC.replace("- Kubernetes 1.21+", "- Kubernetes 1.21+\n- Kubernetes 1.22+")]:
            with self.subTest(doc=doc), self.assertRaises(ValueError):
                scraper.parse_minimum(doc)

    def test_selects_latest_stable_app_then_chart_per_minor(self):
        entries = [fixture(c,a)[0] for c,a in [("0.32.0","0.32.0"),("0.32.1","0.32.0"),("0.31.0","0.31.0"),("0.31.1","0.31.1"),("0.33.0-rc.1","0.33.0"),("0.34.0","0.34.0-rc.1"),("0.27.0","0.27.0")]]
        self.assertEqual([e['version'] for e in scraper.stable_charts(index(*reversed(entries)))], ["0.32.1","0.31.1"])

    def test_duplicate_conflict_rejected(self):
        e,_=fixture()
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            scraper.stable_charts(index(e,{**e,"digest":"0"*64}))

    def test_empty_or_invalid_index_rejected(self):
        for data in ["[]", "entries: {}", index(), index(fixture("0.27.0","0.27.0")[0])]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                scraper.stable_charts(data)

    def test_chart_and_application_version_stay_distinct(self):
        e,p=fixture()
        rows=scraper.build_rows(index(e),"1.23",lambda _:p)
        self.assertEqual(rows,[{"version":"0.32.0","kube":["1.23","1.22","1.21"],"chart_version":"0.32.1","requirements":[],"incompatibilities":[]}])

    def test_each_archive_supplies_its_own_minimum(self):
        e1,p1=fixture("0.32.1","0.32.0")
        e2,p2=fixture("0.31.1","0.31.1",DOC.replace("1.21+","1.20+"))
        rows=scraper.build_rows(index(e2,e1),"1.22",{e1['urls'][0]:p1,e2['urls'][0]:p2}.get)
        self.assertEqual(rows[0]['kube'],["1.22","1.21"])
        self.assertEqual(rows[1]['kube'],["1.22","1.21","1.20"])

    def test_digest_mismatch_and_missing_digest_rejected(self):
        e,p=fixture()
        for bad in [{**e,"digest":"0"*64},{**e,"digest":""}]:
            with self.assertRaisesRegex(ValueError,"SHA256"):
                scraper.packaged_minimum(bad,p)

    def test_archive_identity_mismatch_rejected(self):
        e,p=fixture()
        with self.assertRaisesRegex(ValueError,"differs"):
            scraper.packaged_minimum({**e,"appVersion":"0.32.1"},p)

    def test_missing_archive_member_rejected(self):
        e,p=fixture()
        empty=io.BytesIO()
        with tarfile.open(fileobj=empty,mode='w:gz'):
            pass
        payload=empty.getvalue()
        with self.assertRaisesRegex(ValueError,"missing chart member"):
            scraper.packaged_minimum({**e,"digest":hashlib.sha256(payload).hexdigest()},payload)

    def test_untrusted_archive_url_rejected(self):
        e,_=fixture()
        for url in ['http://github.com/kubernetes-sigs/headlamp/releases/download/a','https://example.com/headlamp.tgz','https://github.com/other/repo/releases/download/a']:
            with self.assertRaisesRegex(ValueError,"official release"):
                scraper.archive_url({**e,"urls":[url]})

    def test_future_and_malformed_kube_versions_rejected(self):
        for minimum,current in [('1.40','1.36'),('1.21','2.0'),('1.21.0','1.36')]:
            with self.assertRaises(ValueError):
                scraper.expand_minimum(minimum,current)

    def test_failed_fetch_does_not_generate_partial_rows(self):
        e,_=fixture()
        with self.assertRaisesRegex(ValueError,"Could not fetch"):
            scraper.build_rows(index(e),'1.36',lambda _:None)

    def test_scrape_passes_verified_rows_to_existing_writer(self):
        e,p=fixture()
        fake=ModuleType('utils')
        fake.fetch_page=Mock(side_effect=lambda url:index(e).encode() if url==scraper.helm_index_url else p)
        fake.current_kube_version=Mock(return_value='1.22')
        fake.update_compatibility_info=Mock()
        with patch.dict(sys.modules,{'utils':fake}):
            scraper.scrape()
        path,rows=fake.update_compatibility_info.call_args.args
        self.assertEqual(path,'../../static/compatibilities/headlamp.yaml')
        self.assertEqual(rows[0]['kube'],['1.22','1.21'])

    def test_scrape_failure_never_calls_writer(self):
        fake=ModuleType('utils')
        fake.fetch_page=Mock(return_value=None)
        fake.update_compatibility_info=Mock()
        fake.current_kube_version=Mock(return_value='1.36')
        with patch.dict(sys.modules,{'utils':fake}), self.assertRaises(ValueError):
            scraper.scrape()
        fake.update_compatibility_info.assert_not_called()

if __name__=='__main__':
    unittest.main()
