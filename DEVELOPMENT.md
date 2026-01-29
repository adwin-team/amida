# AmidaGo! 開発者向けガイド

このドキュメントでは、AmidaGo! の内部設計、アルゴリズム、および開発に役立つ情報について解説します。

## ディレクトリ構造

```text
.
├── index.html      # UIの構造定義
├── style.css       # デザインシステムとアニメーション
├── script.js      # あみだくじのコアロジック
└── README.md       # 一般利用者向けガイド
```

## 技術的な詳細

### 1. データ構造
あみだくじのデータは `AmidaApp` クラスの `state` オブジェクトで管理されています。

- `horizontals`: `{y, from}` の配列。`y` は縦方向のpx、`from` は左側の縦線インデックス。
- `goalMapping`: 縦線の最下部インデックスから、ゴール入力欄のインデックスへのマッピング。

### 2. 生成アルゴリズム (`generateAmida`)
- 縦方向を 15 ステップに分割。
- 各ステップ・各縦線間において、指定された密度 (`horizontalDensity`) に基づきランダムに横線を生成。
- **制約**: 同じ高さで隣接する横線が生成されないよう、左側の有無をチェック。

### 3. 描画とアニメーション
- **Canvas API**: `CanvasRenderingContext2D` を使用。
- **アニメーション**: `requestAnimationFrame` による線形補間。
- **座標計算**: `amida-wrapper` による相対配置と、CSS `transform: translate(-50%, -50%)` による中央揃え。

### 4. デザインシステム
- **Glassmorphism**: `backdrop-filter: blur()` を使用した半透明レイヤー。
- **Color Palette**: `Inter` フォントと、`radial-gradient` による背景深度の演出。

## 開発のヒント

### 人数の拡張
`script.js` の `participant-count` の `max` 値を変更することで、より多くの人数に対応可能ですが、Canvas の描画負荷と視認性を考慮し、現在は 20 人を上限としています。

### カスタマイズ
- 横線の密度を変更するには、`config.horizontalDensity` を調整してください。
- アニメーションの速度を変更するには、`animatePath` メソッド内の `speed` 定数を変更してください。

## 拡張案（将来の展望）
- 横線の手動追加・削除機能（`click` イベントの座標逆引きによる実装）。
- 結果の URL 共有機能。
- サウンドエフェクト（Web Audio API）。
