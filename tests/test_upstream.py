"""原始快照、生成结果与补丁失败保护的关键回归。"""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("upstream_sync", ROOT / "upstream/sync.py")
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


class UpstreamTests(unittest.TestCase):
    def test_original_and_rendered_fingerprints(self):
        manifest = sync.read_json(sync.MANIFEST)
        files = sync.render(manifest)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            sync.write_output(files, output)
            sync.verify(files, output)

    def test_regeneration_is_repeatable_and_keeps_source_metadata_private(self):
        files = sync.render(sync.read_json(sync.MANIFEST))
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            sync.write_output(files, output)
            sync.write_output(files, output)
            sync.verify(files, output)
            self.assertFalse((output / "original").exists())
            self.assertFalse((output / "source.json").exists())
            self.assertFalse((output / "sync.py").exists())
            self.assertFalse((output / "patches.json").exists())

    def test_modified_original_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory) / "candidate"
            shutil.copytree(sync.ORIGINAL, candidate)
            script = candidate / "refresh.js"
            script.write_bytes(script.read_bytes() + b"\n")
            with self.assertRaisesRegex(ValueError, "快照校验失败"):
                sync.render(sync.read_json(sync.MANIFEST), candidate)

    def test_patch_conflict_does_not_modify_tracked_files(self):
        manifest = sync.read_json(sync.MANIFEST)
        before = sync.MANIFEST.read_bytes()
        original = {path.relative_to(sync.ORIGINAL): path.read_bytes() for path in sync.ORIGINAL.rglob("*") if path.is_file()}
        patches = sync.read_json(sync.PATCHES)
        patches["patches"][0]["old"] = "missing upstream patch context"
        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory) / "candidate"
            shutil.copytree(sync.ORIGINAL, candidate)
            bad_patch = Path(directory) / "patches.json"
            bad_patch.write_text(json.dumps(patches), encoding="utf-8")
            with patch.object(sync, "PATCHES", bad_patch):
                with self.assertRaisesRegex(ValueError, "补丁上下文不匹配"):
                    sync.import_snapshot(manifest, candidate, "2026-11-11", 2863)
        self.assertEqual(sync.MANIFEST.read_bytes(), before)
        self.assertEqual({path.relative_to(sync.ORIGINAL): path.read_bytes() for path in sync.ORIGINAL.rglob("*") if path.is_file()}, original)

    def test_import_updates_originals_without_needing_a_generated_tree(self):
        manifest = sync.read_json(sync.MANIFEST)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            original, candidate = root / "original", root / "candidate"
            shutil.copytree(sync.ORIGINAL, original)
            shutil.copytree(sync.ORIGINAL, candidate)
            (original / "retired.js").write_text("old managed resource", encoding="utf-8")
            manifest_path, output = root / "source.json", root / "not-generated"
            with patch.object(sync, "ORIGINAL", original), patch.object(sync, "MANIFEST", manifest_path), patch.object(sync, "OUTPUT", output):
                sync.import_snapshot(manifest, candidate, "2026-11-12", manifest["web_version"])
                self.assertFalse((original / "retired.js").exists())
                self.assertEqual(sync.read_json(manifest_path)["snapshot_date"], "2026-11-12")
                sync.render(sync.read_json(manifest_path), original)
                self.assertFalse(output.exists())

    def test_generation_cannot_overwrite_original_source(self):
        result = subprocess.run([sys.executable, str(ROOT / "upstream/sync.py"), "build", "--output", str(sync.ORIGINAL)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("重叠", result.stderr)
        sync.render(sync.read_json(sync.MANIFEST))


if __name__ == "__main__":
    unittest.main()
