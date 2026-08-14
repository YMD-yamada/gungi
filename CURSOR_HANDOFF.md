# CURSOR_HANDOFF

## 状態（2026-08-14）

- 正本: `C:\Users\cz7\Projects\gungi`
- Web 本番: https://gungi-iota.vercel.app
- プライバシー: https://gungi-iota.vercel.app/privacy.html
- 解析UIは削除。テレメトリは裏で `POST /api/log`（名前・メールなし）
- ローカル永続: `logs/telemetry.jsonl`（Vite middleware）／称号は localStorage
- ファン再構成（非公式）。ストア申請なし。公開HPのみ

## 公開

- スモーク: `npm run build` OK → `npx vercel --prod --yes --scope ymdhude-4490s-projects`
- 掲載: ポートフォリオへエージェントが登録（Cloudflare トークン再発行待ちで本番HP反映は人間必須）

## 注意

- カード・称号はファン向け非公式
- `logs/*.jsonl` は gitignore（README のみ追跡）
