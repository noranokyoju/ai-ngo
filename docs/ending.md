# NEEDY GIRL OVERDOSE 再現仕様 --- エンディング

> エンディング判定は「即時エンド」「日付イベント」「DAY30分岐」「追加/隠し」の順に分離して実装する。
>
> 攻略情報で条件に揺れがあるものは設定値化し、判定ロジックをデータ駆動にする。

## 1. 即時・途中発生エンド

  -----------------------------------------------------------------------------------------------
  ID                       エンディング            主条件
  ------------------------ ----------------------- ----------------------------------------------
  crossing_the_line        Crossing the line       JINEを未読のまま繰り返し放置

  healthy_party            Healthy Party           やみ度0で行動終了

  nymphomania              Nymphomania             えっちなことを規定回数以上実行

  os_alien                 Os-Alien                好感度100到達

  netorare                 NeToRare                好感度0到達

  bomber_girl              Bomber Girl             ストレス上限120解放後、ストレス120で行動終了

  rainbow_girl             Rainbow Girl            まほうのきってを規定回数使用

  angel_fall_down          Angel Fall Down         えっちなはいしん Lv5を配信

  brain_future             脳Future                やみはいしん Lv5を配信

  welcome_to_my_religion   Welcome To My Religion  いんぼうろんLv5以降の特殊手順・特殊配信

  enchantment_fire         Enchantment Fire        高やみ度時の練炭JINEイベントで肯定選択
  -----------------------------------------------------------------------------------------------

### Crossing the line

``` text
if unreadJineCount >= threshold:
    ending = crossing_the_line
```

目安は5回程度。既読スルーと未読放置を別管理する。

### Healthy Party

``` text
if darkness <= 0 after action:
    ending = healthy_party
```

### Nymphomania

``` text
if sexActionCount >= configuredThreshold:
    ending = nymphomania
```

攻略情報に5回以上などの揺れがあるため設定値化。

### Os-Alien / NeToRare

``` text
if affection >= 100: os_alien
if affection <= 0: netorare
```

### Bomber Girl

前提としてストレス上限120が解放済みであること。

``` text
if stressCap == 120 and stress >= 120:
    ending = bomber_girl
```

### Rainbow Girl

`まほうのきって`の使用カウンタを保持し、規定回数で発生。

### Angel Fall Down

`えっちなはいしん Lv5`の配信完了直後に発生。

### 脳Future

`やみはいしん Lv5`の配信完了直後に発生。

### Welcome To My Religion

-   いんぼうろん Lv5を配信
-   その後、まほうのきってを使用
-   特殊/空白の配信ネタを解放
-   それを配信すると終了

### Enchantment Fire

-   やみ度が高い状態で特殊JINEイベント候補を発生
-   練炭に関する提案への肯定選択で分岐
-   原作では通常のゲームオーバーとは異なる特殊扱いのため、`terminal: false`
    を設定可能にする

## 2. 日付による強制エンド

### Die Set Down

DAY10終了時に収益化条件未達。

``` text
if day == 10 and endOfDay and followers < 10_000:
    ending = die_set_down
```

### INTERNET OVERDOSE

ストレス上限120を解放済みで、DAY25付近に高ストレスを維持している場合の特殊ルート。

実装目安:

``` text
if day >= 25
  and stressCap == 120
  and stress >= 80:
    ending = internet_overdose
```

発生後は通常の自由行動を止め、専用シーケンスへ移行する。

## 3. DAY30 通常分岐

途中エンドが発生せずDAY30を迎えた場合に判定する。

### 3.1 フォロワー50万人未満

  エンディング          条件
  --------------------- ---------------------------------
  Catastrophe           好感度 \< 60 AND やみ度 \< 60
  There Is No Angel     好感度 \< 60 AND やみ度 \>= 60
  Labor is Evil         好感度 \>= 60 AND やみ度 \< 60
  NEEDY GIRL OVERDOSE   好感度 \>= 60 AND やみ度 \>= 60

``` text
if followers < 500_000:
    if affection < 60 and darkness < 60: catastrophe
    if affection < 60 and darkness >= 60: there_is_no_angel
    if affection >= 60 and darkness < 60: labor_is_evil
    if affection >= 60 and darkness >= 60: needy_girl_overdose
```

`NEEDY GIRL OVERDOSE`には終盤の会話/入力により演出上の追加分岐があるため、エンディングIDとエピローグ分岐を分ける。

### 3.2 フォロワー50万人以上100万人未満

  エンディング             条件
  ------------------------ ---------------
  Angry Otaku Needy Girl   好感度 \< 80
  Utopian Parody           好感度 \>= 80

### 3.3 フォロワー100万人以上

  -----------------------------------------------------------------------
  エンディング                        条件
  ----------------------------------- -----------------------------------
  (Un)Happy End World                 好感度 \>= 80 AND やみ度 \< 80

  Do You Love Me?                     好感度 \>= 80 AND やみ度 \>= 80 AND
                                      100万人記念配信済み
  -----------------------------------------------------------------------

`Do You Love Me?`については攻略情報上、ストレス上限100を維持していることも重要とされる。原作再現では次を追加条件候補として設定可能にする:

``` text
stressCap == 100
```

100万人以上で上記に該当しないケースの優先順位は、実機検証で確定すること。

## 4. 追加エンディング

### Milky Way Train

条件: 1. ネットロア Lv5を配信済み 2. 昼にODを実行 3.
特殊外出先「銀河ステーション」を出現 4. 銀河ステーションへ行く

### DARK ANGEL

条件: 1. ストレス上限120の危険状態 2. フォロワー100万人到達 3.
`ウラ・インターネットエンジェル`を解放 4. それを配信 5.
専用シーケンス後に終了

### THE INTERNET ANGEL Be INVOKED

``` text
if followers >= 9_999_999:
    ending = the_internet_angel_be_invoked
```

フォロワー上限到達による特殊エンド。

### Data0

-   必要なエンディングを回収後、セーブ選択画面に特殊スロット`Data0`を出現させる。
-   通常プレイ中のパラメータ判定ではなく、メタ進行フラグで管理する。

### Happy End World

-   `(Un)Happy End World`の条件を満たしたDAY30セーブを前提とする。
-   原作はゲーム外部のネットワーク状態を利用する隠し分岐。
-   再現版では `isOffline` のような環境フラグで分岐可能にする。

``` text
if qualifiesForUnhappyEndWorld and isOffline:
    ending = happy_end_world
```

## 5. エンディング判定優先順位

推奨:

``` text
1. コマンド直後の即時エンド
2. 配信直後の即時エンド
3. 時間進行イベントによるエンド
4. DAY10 Die Set Down
5. DAY25+ INTERNET OVERDOSE
6. 特殊追加エンド
7. DAY30 パラメータ分岐
8. メタ進行系 Data0 / Happy End World
```

同一フレームで複数条件が成立した場合に備え、各EndingDefinitionに`priority`を持たせる。

## 6. 推奨データ構造

``` ts
type EndingTrigger =
  | "after_command"
  | "after_stream"
  | "end_of_timeslot"
  | "end_of_day"
  | "day30"
  | "meta";

interface EndingDefinition {
  id: string;
  title: string;
  trigger: EndingTrigger;
  priority: number;
  terminal: boolean;
  condition: EndingCondition;
}

interface MetaProgress {
  seenEndings: Set<string>;
  data0Unlocked: boolean;
}
```

## 7. 実装・検証用テストケース

最低限、以下を自動テストする。

-   DAY10 / followers=9,999 -\> Die Set Down
-   DAY10 / followers=10,000 -\> 継続
-   darkness=1から-1され0 -\> Healthy Party
-   affection=99から+2 -\> Os-Alien
-   affection=1から-2 -\> NeToRare
-   stressCap=120, stress=120 -\> Bomber Girl
-   followers=499,999 / affection=59 / darkness=59 -\> Catastrophe
-   followers=499,999 / affection=59 / darkness=60 -\> There Is No Angel
-   followers=499,999 / affection=60 / darkness=59 -\> Labor is Evil
-   followers=499,999 / affection=60 / darkness=60 -\> NEEDY GIRL
    OVERDOSE
-   followers=500,000 / affection=79 -\> Angry Otaku Needy Girl
-   followers=500,000 / affection=80 -\> Utopian Parody
-   followers=1,000,000 / affection=80 / darkness=79 -\> (Un)Happy End
    World
-   followers=1,000,000 / affection=80 / darkness=80 / 100万人記念済み
    -\> Do You Love Me?
-   followers=9,999,999 -\> THE INTERNET ANGEL Be INVOKED
