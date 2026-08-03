import { PIECE_METAS } from '../game/pieces'

export function RulesPanel() {
  return (
    <aside className="rules" aria-label="ルール説明">
      <h2>グンギとは</h2>
      <p>
        『HUNTER×HUNTER』に登場する東国の盤上遊戯です。9×9の盤に駒を重ね（最大3段）、相手の
        <strong>帥（すい）</strong>
        を取ると勝ちます。原作・公式では完全な競技ルールは公開されていないため、本アプリはガイドブック断片と作中描写に基づく
        <strong>ファン再構成のプレイアブル版</strong>
        です。
      </p>

      <h3>流れ</h3>
      <ol>
        <li>
          <strong>配置フェーズ</strong>
          ：交互に自陣（先手＝下3段、後手＝上3段）の空きマスへ手駒を置く。帥を置いたあと「配置完了」を押せる。残った駒は手駒のまま対局へ持ち込める。
        </li>
        <li>
          <strong>対局フェーズ</strong>
          ：手番ごとに「盤上の駒を動かす」か「手駒を打つ」。先手（黒）から開始。
        </li>
        <li>
          <strong>勝利</strong>
          ：相手の帥を捕獲した瞬間に勝利。
        </li>
      </ol>

      <h3>山（スタック）</h3>
      <ul>
        <li>同じマスに自駒を最大3枚まで重ねられる。</li>
        <li>動けるのは常に山の一番上。</li>
        <li>敵の山へ進入すると、その山をまとめて取り除き、自駒がそこに着地する（捕獲）。</li>
        <li>帥は他駒の下に潜れない。砦などへ帥を重ねることもできない。</li>
      </ul>

      <h3>打ち（ドロップ）</h3>
      <p>
        対局中、手駒は空きマス、または高さに余裕のある自山の上へ打てます（敵駒の上には打てません）。砦は動けませんが、打ちと重ねは可能です。
      </p>

      <h3>駒の動き</h3>
      <div className="rules-pieces">
        {PIECE_METAS.map((m) => (
          <article key={m.type} className="rules-piece">
            <header>
              <span className="rules-kanji">{m.kanji}</span>
              <span>
                {m.name}
                <small>×{m.count}</small>
              </span>
            </header>
            <p>{m.detail}</p>
          </article>
        ))}
      </div>

      <h3>対戦モード</h3>
      <ul>
        <li>
          <strong>ローカル2人</strong>
          ：同じ端末で交互に操作。
        </li>
        <li>
          <strong>対CPU</strong>
          ：あなたが先手（黒）。配置も対局もCPUが後手を担当。
        </li>
        <li>
          <strong>オンライン</strong>
          ：ホストが部屋コードを共有し、相手が参加。ホスト＝先手、ゲスト＝後手。PeerJS
          によるブラウザ間同期です（同じネット／ファイアウォール制約で繋がらない場合があります）。
        </li>
      </ul>

      <h3>ログ</h3>
      <ul>
        <li>対局の着手などは端末内バックアップに加え、負荷の低い範囲でサーバー（ローカルでは logs/telemetry.jsonl）へ送ります。</li>
        <li>アプリ上に解析画面は出しません。あとからログを見て振り返れます。</li>
        <li>CPU対戦では時間表示しません。オンラインは参考用の整数秒のみです。</li>
        <li>「コレクション」でレーティング・称号・G.I.風カードを集められます（カード絵は非公式オリジナル）。</li>
      </ul>

      <h3>操作</h3>
      <ul>
        <li>手駒をクリック → 光るマスへクリックで配置／打ち。</li>
        <li>自駒（山の頂点）をクリック → 合法手のマスへクリックで移動。</li>
        <li>Webでも、ビルド済みファイルを開いても同じUIで遊べます。</li>
      </ul>
    </aside>
  )
}
