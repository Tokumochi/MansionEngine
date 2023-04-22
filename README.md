# Mansion Engine
## 開発の動機
- ##### Unityのようなゲームエンジンは、ゲームオブジェクトにスクリプトを載せて、毎フレームごとにそのスクリプトを実行して動作する仕組み
    - オブジェクト同士の複雑な依存関係ができやすく、大規模化してしまう場合、ノウハウがないと新しく単体の機能のみを作成してテストするのが難しいと考えられる

- ##### 小さなコンポーネントを作成し、そのコンポーネントのみをテストし、そのコンポーネントたちをシンプルに繋ぎ合わせて大きな１つのゲームを作ることが一貫して行える仕組みがあればいい
    - シューティングゲームの開発を例に考える
        - 入力に対してプレイヤーがどう動くかなどをまとめたPlayerコンポーネント、及び、敵がどう動くかなどをまとめたEnemyコンポーネント、そしてその２つのコンポーネントからそれぞれプレイヤーと敵のオブジェクトの情報を受け取って画面に表示するDisplayコンポーネントがあると考える

        ![](https://i.imgur.com/WK9zKnP.png)
        
        - ここで新たに敵が弾を発射するようにしたいと考える
        - Enemyコンポーネントから受け取った敵のオブジェクトの情報をもとに、新たに弾のオブジェクトを生成して、敵のオブジェクトと共に上のコンポーネントに渡すEnemy_with_bulletコンポーネントを新たに作成する
        
        ![](https://i.imgur.com/xiwD7DM.png)
        
        - Enemyコンポーネントでは敵がどう動くかをテストでき、Enemy_with_bulletコンポーネントでは弾が敵からどのように発射されるかをテストできる
        - もしここで新しい動きを敵ができるようにしたい場合、Enemyコンポーネントのみを書き換えて、敵の動きのみをテストすることができる。
 
- ##### 提案するコンセプトで得られる恩恵
    - 部分的なコンポーネントのみを作成して実行できる
        - テストがしやすくなる
        - チームで開発しやすくなる
    - 拡張機能を各コンポーネントの開発のみに部分的に適用して開発が可能
    - 常に下のコンポーネントから上のコンポーネントにかけて実行されるので、実行手順を明示的に示しながらの開発が可能。これにより、これまで各オブジェクト間のデータの受け渡しなどで発生しやすかったバグを減らせられると考えられる

## 基本的な機能・仕組み
- ##### １つのコンポーネントを作成するための空間を"room"とする
    - roomでは、基本的にデータとプロセスを配置するノードプログラミングによってコンポーネントを作成する
    - roomでノードプログラミングした内容は、基本的に1フレーム間に実行される内容である
    - roomはデータの出力をもつ
    - 循環がない限り、他roomの出力もデータとして扱うことができる
    - roomごとに実行することができ、部分的に機能のテストが可能
- ##### 特殊なroomの扱い方も検討している
    - 出力のデータの型が同じroomの中から、インデックスにより１つのroomのみを選び、その出力をデータとして用いる
    - roomを非同期で実行し、最新の出力をデータとして用いる

## 実装
- 現状はとりあえず仕組みとしてだけ提供したいため、SPAで利用できるようにする
- ブラウザの複数のタブ、ウィンドウで同時に共有して作業を行えるようにするため、フロントエンド・バックエンドで分けて、バックエンド側ではプロジェクトにおけるデータの管理を行い、フロントエンド側でユーザは作業を行えるようにする
- フロントエンドは以前から知識のあったReactで実装する
- バックエンドはexpress.jsで実装する
- socket.ioでフロント・バック間のデータの受け渡しを行う
- コードはfront-dev-mainブランチ、back-dev-mainブランチへ
