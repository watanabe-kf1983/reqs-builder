# 設定システム仕様

reqs-builder の設定システムの振る舞いを定義する。

## 設定の読み込み

### 優先順位

設定は以下の順序でマージされる（後のものが優先）:

1. デフォルト値
2. 設定ファイル
3. 環境変数
4. コマンドライン引数

### 設定ファイル

- ファイル名: `.stdgrc` または `.stdgrc.json`
- 配置場所: プロジェクトルート
- 対応フォーマット: JSON, INI

#### JSON形式の例

```json
{
  "output": {
    "dir": "./build"
  },
  "preview": {
    "hugo": {
      "port": 8080
    }
  }
}
```

#### INI形式の例

```ini
output.dir=./build
preview.hugo.port=8080
```

### 環境変数

- プレフィックス: `STDG_`
- ネスト区切り: `__`（アンダースコア2つ）

例:
- `STDG_OUTPUT__DIR=./build`
- `STDG_PREVIEW__HUGO__PORT=8080`

### コマンドライン引数

- プレフィックス: `--`
- ネスト区切り: `.`（ドット）

例:
- `--output.dir=./build`
- `--preview.hugo.port=8080`

## 設定スキーマ

| キー | 型 | デフォルト | 説明 |
|------|-----|---------|------|
| `output.dir` | string | `./docs` | Generator の出力先ディレクトリ |
| `preview.hugo.*` | any | (なし) | hugo-bin に渡すオプション |
| `preview.customServer.command` | string | (なし) | カスタムプレビューサーバのコマンド。設定時は hugo-bin の代わりに使用（未実装：AsciiDoc対応時に実装予定） |
