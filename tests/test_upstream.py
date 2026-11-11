"""原始快照、生成结果与补丁失败保护的关键回归。"""
import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("upstream_sync", ROOT / "tools/upstream/sync.py")
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


class UpstreamTests(unittest.TestCase):
    def test_original_and_generated_fingerprints(self):
        manifest = sync.read_json(sync.MANIFEST)
        sync.verify(sync.render(manifest), sync.OUTPUT)

    def test_regeneration_is_repeatable_and_preserves_local_guides(self):
        files = sync.render(sync.read_json(sync.MANIFEST))
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / "README.md").write_text("local guide", encoding="utf-8")
            sync.write_output(files, output)
            sync.write_output(files, output)
            sync.verify(files, output)
            self.assertEqual((output / "README.md").read_text(), "local guide")

    def test_modified_original_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory) / "candidate"
            shutil.copytree(sync.SNAPSHOT, candidate)
            script = candidate / "refresh.js"
            script.write_bytes(script.read_bytes() + b"\n")
            with self.assertRaisesRegex(ValueError, "快照校验失败"):
                sync.render(sync.read_json(sync.MANIFEST), candidate)

    def test_patch_conflict_does_not_modify_tracked_files(self):
        manifest = sync.read_json(sync.MANIFEST)
        before = sync.MANIFEST.read_bytes()
        patches = sync.read_json(sync.PATCHES)
        patches["patches"][0]["old"] = "missing upstream patch context"
        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory) / "candidate"
            shutil.copytree(sync.SNAPSHOT, candidate)
            bad_patch = Path(directory) / "patches.json"
            import json
            bad_patch.write_text(json.dumps(patches), encoding="utf-8")
            with patch.object(sync, "PATCHES", bad_patch):
                with self.assertRaisesRegex(ValueError, "补丁上下文不匹配"):
                    sync.import_snapshot(manifest, candidate, "2026-11-11", 2863)
        self.assertEqual(sync.MANIFEST.read_bytes(), before)
        sync.verify(sync.render(manifest), sync.OUTPUT)


if __name__ == "__main__":
    unittest.main()
