# CURSOR_HANDOFF

## 状態（2026-08-03）

- `C:\Users\cz7\Projects\gungi`
- 解析UIは削除。テレメトリは裏で `POST /api/log`
- ローカル永続: `logs/telemetry.jsonl`（Vite middleware）
- 本番: `api/log.ts` がバッチ受理＋runtime log 要約のみ
- あとでチャットから解析するときは `logs/telemetry.jsonl` を読む

## 注意

- カード・称号はファン向け非公式
- `logs/*.jsonl` は gitignore（README のみ追跡）
