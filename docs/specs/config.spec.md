# 設定システム仕様

reqs-builder の設定システムの振る舞いを定義する。

## 設定の読み込み

### 優先順位

設定は以下の順序でマージされる（後のものが優先）:

1. デフォルト値
2. 設定ファイル
3. 環境変数

### 設定ファイル

- ファイル名: `stdg.json`
- 配置場所: プロジェクトルート
- 対応フォーマット: JSON

#### JSON形式の例

```json
{
  "output": {
    "doc": {
      "dir": "./build"
    }
  }
}
```

### 環境変数

各設定項目に対応する環境変数は、設定スキーマの「環境変数」列を参照。

## 設定スキーマ

| キー | 型 | デフォルト | 環境変数 | 説明 |
|------|-----|---------|----------|------|
| `output.doc.dir` | string | `./docs` | `STDG_OUTPUT_DOC_DIR` | Generator の出力先ディレクトリ |
| `render.hugo.*` | object | `{}` | (なし) | hugo-bin に渡すオプション（設定ファイルのみ）（未実装） |
| `render.customServer.command` | string | (なし) | `STDG_RENDER_CUSTOM_SERVER_COMMAND` | カスタムレンダリングサーバのコマンド。設定時は hugo-bin の代わりに使用（未実装：AsciiDoc対応時に実装予定） |
