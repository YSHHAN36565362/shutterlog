/* ==================================================================
   i18n.js — 日本語 / 한국어 / English

   · 텍스트는 외부 JSON 이 아니라 이 파일 안의 객체에 둡니다.
     fetch 가 필요 없어 CORS·네트워크 실패의 영향을 받지 않고,
     로컬에서 파일을 더블클릭해도 동작합니다.
   · 문구를 고칠 때는 ja / ko / en 세 곳을 모두 고쳐야 합니다.
   · 기본 언어는 일본어입니다. 마지막 선택은 localStorage 에 남습니다.
   ================================================================== */
(function (global) {
  'use strict';

  var T = {
    ja: {
      'nav.globe': 'Globe', 'nav.archive': 'Archive', 'nav.tools': 'Tools',
      'nav.about': 'About', 'nav.main': 'Main Portfolio ↗', 'nav.back': '← Shutterlog',

      'globe.eyebrow': 'Travel Archive',
      'globe.title1': '歩いた場所を、',
      'globe.title2': '一枚ずつ',
      'globe.lead': 'ドラッグで回して、ホイールで近づいてください。近づくほど、その土地の写真が増えます。',
      'globe.hint1': 'ドラッグ = 回転',
      'globe.hint2': 'ホイール = ズーム',
      'globe.hint3': '写真をクリック = その旅へ',
      'globe.scroll': 'Scroll',
      'globe.peekCta': 'この旅を見る',
      'globe.fallbackTitle': 'お使いの環境では地球儀を表示できません',
      'globe.fallbackBody': '下の一覧から旅ごとにご覧いただけます。',
      'globe.fallbackCta': '旅の一覧へ',
      'level.0': 'WORLD', 'level.1': 'REGION', 'level.2': 'TRIP', 'level.3': 'CITY',

      'stats.countries': 'Countries', 'stats.cities': 'Cities',
      'stats.trips': 'Trips', 'stats.photos': 'Photos',

      'archive.eyebrow': 'Archive',
      'archive.heading': '旅ごとのアルバム',
      'archive.lead': '旅は行った順に並んでいます。各アルバムの中は撮影日時順が基本で、焦点距離・絞り・ISO でも並べ替えられます。',
      'card.photos': '枚', 'card.review': '日付要確認', 'card.empty': '写真準備中',
      'card.cities': '都市',

      'tools.eyebrow': 'Tools',
      'tools.heading': '写真ワークフローを自動化する',
      'tools.lead': '旅から帰るたびに手でやっていた作業を、そのままブラウザの中に移しました。写真はサーバーに一枚も送られません。すべて端末の中だけで処理されます。',
      'tool1.title': '選別 — ブレたカットを外す',
      'tool1.body': '撮影時刻・焦点距離・画像ハッシュの三つで似たカットをまとめ、グループの中で相対的にいちばんシャープな一枚を提案します。消すのは必ず人間です。',
      'tool2.title': '分析 — 自分の撮影癖を測る',
      'tool2.body': '焦点距離・絞り・ISO・時間帯の分布に加えて、どの設定で失敗しやすいかを出します。CSV を書き出して Python / R でさらに掘れます。',
      'tool3.title': '額装 — EXIF の縁とサイン',
      'tool3.body': '機材と設定を下の余白に刻む額縁を 3 種類。ウォーターマークは位置・色・大きさ・不透明度を写真の雰囲気に合わせて調整できます。',
      'tool.open': '開く',
      'tools.pipeTitle': '4 つの段階がひとつの流れになっています',
      'tools.pipeBody': '機能を三つ並べたのではなく、「写真フォルダを入れるとポートフォリオの 1 ページが出てくる」までを一本の流れとして設計しました。選別 → 分析 → 額装 → アーカイブ。最後のアーカイブが、このページの上にある地球儀です。',
      'tools.privacy': '<b>プライバシー：</b>3 つのツールはすべてブラウザ内で完結します。アップロードも保存も行いません。ページを閉じた時点で何も残りません。',

      'about.eyebrow': 'About', 'about.heading': 'なぜ作ったか',
      'about.p1': '趣味は写真です。旅から帰ると数千枚が残り、その中から人に見せられる十数枚を選ぶまでが毎回いちばん時間のかかる作業でした。手でやっていたその選別と整理を、専攻のデータ分析と結びつけて自動化したのがこのサイトです。',
      'about.p2': '「なんとなく上手く撮れた気がする」を数字にしたかった、というのが出発点です。自分が選んだ写真の EXIF を集計すると、どの焦点距離・どの絞りで成功しているかがはっきり出ます。逆に 1/60 秒より遅いシャッターでの失敗率のような、感覚では気づけない限界も見えてきます。',
      'about.techTitle': '技術メモ',
      'about.tech1': '<strong>地球儀</strong>：three.js。国境は Natural Earth の GeoJSON をブラウザ内で等距円筒図法のキャンバスに描き、それを球に貼っています。訪問国の色は <code>trips.meta.json</code> から決まるので、国を足せば色も増えます。',
      'about.tech2': '<strong>マーカー</strong>：3D スプライトではなく、3D 座標を画面座標に投影した本物の <code>&lt;img&gt;</code> です。写真がぼやけず、キーボード操作もそのまま効きます。',
      'about.tech3': '<strong>EXIF</strong>：ツール側は exifr、サイト生成側は Python (Pillow)。同じ値を二か所で読むので、<code>build.py</code> の出力とツールの表示は一致します。',
      'about.tech4': '<strong>依存関係</strong>：CDN は使いません。ライブラリはすべてリポジトリに同梱し、読み込みに失敗してもページ本体は動きます。以前 CDN の失敗でサイトが真っ白になった経験からの規則です。',
      'about.repoTitle': 'リポジトリ',
      'about.repoBody': '写真の追加方法、フォルダの命名規則、<code>build.py</code> の使い方は README にまとめてあります。',
      'about.mainCta': 'メインのポートフォリオ',

      /* --- 旅の詳細ページ --- */
      'trip.back': '← 旅の一覧',
      'trip.sortBy': '並べ替え',
      'sort.date': '撮影日時', 'sort.focal': '焦点距離', 'sort.fnum': '絞り',
      'sort.iso': 'ISO', 'sort.shutter': 'シャッター', 'sort.name': 'ファイル名',
      'trip.asc': '昇順', 'trip.desc': '降順',
      'trip.empty': 'この旅の写真はまだ入っていません。',
      'trip.emptyHow': 'リポジトリの <code>photos/</code> の中の該当フォルダに JPEG を置いて <code>python3 build.py</code> を実行すると、ここに並びます。',
      'trip.noexif': 'EXIF なし',
      'trip.spots': '訪れた街',
      'trip.of': '/',
      'trip.close': '閉じる',
      'trip.prev': '前へ', 'trip.next': '次へ',

      /* --- ツール共通 --- */
      'dz.title': '写真をここにドロップ',
      'dz.or': 'または',
      'dz.pick': 'ファイルを選ぶ',
      'dz.note': 'JPEG / PNG。写真は端末から出ません。',
      'dz.reading': '読み込み中',
      'busy.exif': 'EXIF を読んでいます',
      'busy.sharp': 'シャープネスを測っています',
      'busy.hash': '画像ハッシュを計算しています',
      'common.reset': '最初から',
      'common.export': '書き出す',
      'common.photos': '枚',
      'common.download': 'ダウンロード',
      'common.none': '該当なし',

      /* --- 01 選別 --- */
      'cull.title': '選別',
      'cull.lead': '似たカットをまとめ、その中で相対的にシャープな一枚を提案します。判断と削除は必ずあなたが行います。',
      'cull.optGap': '同じグループとみなす撮影間隔',
      'cull.optFocal': '焦点距離の許容差',
      'cull.optHash': '構図の類似度しきい値',
      'cull.optHelp': '時刻だけでまとめると、3 秒以内に別のものを撮った写真まで同じグループに入ってしまいます。焦点距離と構図ハッシュを併用して、その誤りを減らしています。',
      'cull.groups': 'グループ',
      'cull.singles': '単独カット',
      'cull.best': 'ベスト',
      'cull.markDelete': '削除候補にする',
      'cull.marked': '削除候補',
      'cull.sharp': 'シャープネス',
      'cull.rel': 'グループ内',
      'cull.exportTxt': '削除リスト (.txt)',
      'cull.exportSh': '削除スクリプト (.sh)',
      'cull.warn': '<b>このツールは何も削除しません。</b>ブラウザには元ファイルを消す権限がありません。書き出したリストを確認したうえで、ご自身で削除してください。',
      'cull.blurNote': '開放で背景をぼかした写真は画面全体の分散が下がるため、単純なスコアだと「ブレ」と誤判定されます。画面をタイルに分けていちばん鋭い部分だけを見て、さらに同じグループの中の相対順位でのみ判断しています。',

      /* --- 02 分析 --- */
      'stats.title': '分析',
      'stats.lead': '自分が撮った写真の EXIF を集計します。どの設定で成功しているかを数字で見るためのものです。',
      'stats.focal': '焦点距離', 'stats.fnum': '絞り', 'stats.iso': 'ISO',
      'stats.shutter': 'シャッター速度', 'stats.hour': '撮影時間帯',
      'stats.body': 'ボディ', 'stats.lens': 'レンズ', 'stats.month': '月別',
      'stats.sharpTitle': 'シャッター速度と失敗率',
      'stats.sharpLead': 'シャープネスの下位 25% を「失敗」とみなし、設定ごとの失敗率を出します。手ブレの限界が数字で出ます。',
      'stats.failRate': '失敗率',
      'stats.samples': '枚',
      'stats.insightFocal': 'いちばん使う焦点距離',
      'stats.insightFnum': 'いちばん使う絞り',
      'stats.insightHour': 'いちばん撮る時間帯',
      'stats.insightLimit': '手ブレの目安',
      'stats.csv': 'CSV を書き出す',
      'stats.csvNote': '書き出した CSV は <code>analysis/</code> の Python / R スクリプトでそのまま読めます。',

      /* --- 03 額装 --- */
      'frame.title': '額装',
      'frame.lead': '機材と設定を余白に刻んだ一枚を書き出します。フォントはこのサイトと同じ Quicksand + Playfair です。',
      'frame.style': '額縁',
      'frame.style1': 'ミニマル', 'frame.style2': 'フィルム', 'frame.style3': 'ダーク',
      'frame.ratio': '書き出し比率',
      'frame.ratioOrig': '元のまま',
      'frame.caption': 'キャプション',
      'frame.showCam': 'ボディ', 'frame.showLens': 'レンズ',
      'frame.showExp': '露出', 'frame.showDate': '日付', 'frame.showPlace': '場所',
      'frame.place': '場所（任意）',
      'frame.accent': 'アクセント色',
      'frame.accentAuto': '写真から自動',
      'frame.wm': 'ウォーターマーク',
      'frame.wmText': 'サイン文字',
      'frame.wmImg': '画像を使う (PNG)',
      'frame.wmPos': '位置',
      'frame.wmAuto': '自動（明るさで判定）',
      'frame.wmColor': '色',
      'frame.wmSize': '大きさ',
      'frame.wmOpacity': '不透明度',
      'frame.wmInCaption': '額縁のキャプション行に入れる',
      'frame.wmInCaptionNote': '額縁を使うときは写真の上ではなくキャプション行に置いたほうが、写真を隠さずに済みます。',
      'frame.save': 'PNG で保存',
      'frame.saveJpg': 'JPEG で保存',
      'frame.pickFirst': 'まず写真を 1 枚選んでください。'
    },

    ko: {
      'nav.globe': 'Globe', 'nav.archive': 'Archive', 'nav.tools': 'Tools',
      'nav.about': 'About', 'nav.main': '메인 포트폴리오 ↗', 'nav.back': '← Shutterlog',

      'globe.eyebrow': 'Travel Archive',
      'globe.title1': '걸어본 곳을,',
      'globe.title2': '한 장씩',
      'globe.lead': '드래그로 돌리고 휠로 다가가 보세요. 가까이 갈수록 그 지역의 사진이 늘어납니다.',
      'globe.hint1': '드래그 = 회전',
      'globe.hint2': '휠 = 확대',
      'globe.hint3': '사진 클릭 = 그 여행으로',
      'globe.scroll': 'Scroll',
      'globe.peekCta': '이 여행 보기',
      'globe.fallbackTitle': '이 환경에서는 지구본을 표시할 수 없습니다',
      'globe.fallbackBody': '아래 목록에서 여행별로 보실 수 있습니다.',
      'globe.fallbackCta': '여행 목록으로',
      'level.0': 'WORLD', 'level.1': 'REGION', 'level.2': 'TRIP', 'level.3': 'CITY',

      'stats.countries': '나라', 'stats.cities': '도시',
      'stats.trips': '여행', 'stats.photos': '사진',

      'archive.eyebrow': 'Archive',
      'archive.heading': '여행별 앨범',
      'archive.lead': '여행은 다녀온 순서로 놓았습니다. 앨범 안은 촬영 일시순이 기본이고 초점거리·조리개·ISO로도 정렬할 수 있습니다.',
      'card.photos': '장', 'card.review': '날짜 확인 필요', 'card.empty': '사진 준비 중',
      'card.cities': '도시',

      'tools.eyebrow': 'Tools',
      'tools.heading': '사진 워크플로를 자동화하기',
      'tools.lead': '여행에서 돌아올 때마다 손으로 하던 작업을 그대로 브라우저 안으로 옮겼습니다. 사진은 서버로 한 장도 전송되지 않습니다. 전부 기기 안에서만 처리됩니다.',
      'tool1.title': '컬링 — 흔들린 컷 골라내기',
      'tool1.body': '촬영 시각·초점거리·이미지 해시 세 가지로 비슷한 컷을 묶고, 그룹 안에서 상대적으로 가장 선명한 한 장을 제안합니다. 지우는 건 반드시 사람입니다.',
      'tool2.title': '분석 — 내 촬영 습관 재기',
      'tool2.body': '초점거리·조리개·ISO·시간대 분포에 더해 어떤 설정에서 실패하기 쉬운지를 냅니다. CSV로 내보내 Python / R로 더 파볼 수 있습니다.',
      'tool3.title': '액자 — EXIF 프레임과 서명',
      'tool3.body': '장비와 설정을 아래 여백에 새기는 액자 3종. 워터마크는 위치·색·크기·불투명도를 사진 분위기에 맞춰 조절할 수 있습니다.',
      'tool.open': '열기',
      'tools.pipeTitle': '네 단계가 하나의 흐름입니다',
      'tools.pipeBody': '기능 세 개를 늘어놓은 게 아니라, "사진 폴더를 넣으면 포트폴리오 한 페이지가 나오는" 데까지를 한 줄기로 설계했습니다. 고르기 → 분석 → 액자 → 아카이브. 마지막 아카이브가 이 페이지 위의 지구본입니다.',
      'tools.privacy': '<b>프라이버시:</b> 세 도구 모두 브라우저 안에서 끝납니다. 업로드도 저장도 하지 않습니다. 페이지를 닫는 순간 아무것도 남지 않습니다.',

      'about.eyebrow': 'About', 'about.heading': '왜 만들었나',
      'about.p1': '취미는 사진입니다. 여행에서 돌아오면 수천 장이 남고, 그중 남에게 보여줄 십몇 장을 고르기까지가 매번 가장 오래 걸리는 작업이었습니다. 손으로 하던 그 선별과 정리를 전공인 데이터 분석과 엮어 자동화한 것이 이 사이트입니다.',
      'about.p2': '"어쩐지 잘 찍힌 것 같다"를 숫자로 만들고 싶었던 게 출발점입니다. 내가 고른 사진의 EXIF를 모아보면 어느 초점거리, 어느 조리개에서 성공하는지가 분명히 드러납니다. 반대로 1/60초보다 느린 셔터에서의 실패율처럼 감각으로는 알 수 없는 한계도 보입니다.',
      'about.techTitle': '기술 메모',
      'about.tech1': '<strong>지구본</strong>: three.js. 국경은 Natural Earth GeoJSON을 브라우저 안에서 등장방형 캔버스에 그린 뒤 구에 입혔습니다. 방문국 색은 <code>trips.meta.json</code>에서 결정되므로 나라를 추가하면 색도 늘어납니다.',
      'about.tech2': '<strong>마커</strong>: 3D 스프라이트가 아니라 3D 좌표를 화면 좌표로 투영한 진짜 <code>&lt;img&gt;</code>입니다. 사진이 뭉개지지 않고 키보드 조작도 그대로 됩니다.',
      'about.tech3': '<strong>EXIF</strong>: 도구 쪽은 exifr, 사이트 생성 쪽은 Python(Pillow). 같은 값을 두 곳에서 읽으므로 <code>build.py</code>의 출력과 도구의 표시가 일치합니다.',
      'about.tech4': '<strong>의존성</strong>: CDN을 쓰지 않습니다. 라이브러리는 전부 저장소에 동봉했고, 로드에 실패해도 페이지 본체는 동작합니다. 예전에 CDN 실패로 사이트가 하얗게 됐던 경험에서 나온 규칙입니다.',
      'about.repoTitle': '저장소',
      'about.repoBody': '사진 추가 방법, 폴더 명명 규칙, <code>build.py</code> 사용법은 README에 정리해 두었습니다.',
      'about.mainCta': '메인 포트폴리오',

      'trip.back': '← 여행 목록',
      'trip.sortBy': '정렬',
      'sort.date': '촬영 일시', 'sort.focal': '초점거리', 'sort.fnum': '조리개',
      'sort.iso': 'ISO', 'sort.shutter': '셔터', 'sort.name': '파일명',
      'trip.asc': '오름차순', 'trip.desc': '내림차순',
      'trip.empty': '이 여행의 사진은 아직 들어있지 않습니다.',
      'trip.emptyHow': '저장소의 <code>photos/</code> 안 해당 폴더에 JPEG을 넣고 <code>python3 build.py</code>를 실행하면 여기에 놓입니다.',
      'trip.noexif': 'EXIF 없음',
      'trip.spots': '들른 도시',
      'trip.of': '/',
      'trip.close': '닫기',
      'trip.prev': '이전', 'trip.next': '다음',

      'dz.title': '사진을 여기에 놓으세요',
      'dz.or': '또는',
      'dz.pick': '파일 선택',
      'dz.note': 'JPEG / PNG. 사진은 기기 밖으로 나가지 않습니다.',
      'dz.reading': '읽는 중',
      'busy.exif': 'EXIF를 읽고 있습니다',
      'busy.sharp': '선명도를 재고 있습니다',
      'busy.hash': '이미지 해시를 계산하고 있습니다',
      'common.reset': '처음부터',
      'common.export': '내보내기',
      'common.photos': '장',
      'common.download': '다운로드',
      'common.none': '해당 없음',

      'cull.title': '컬링',
      'cull.lead': '비슷한 컷을 묶고 그 안에서 상대적으로 선명한 한 장을 제안합니다. 판단과 삭제는 반드시 본인이 합니다.',
      'cull.optGap': '같은 그룹으로 볼 촬영 간격',
      'cull.optFocal': '초점거리 허용 오차',
      'cull.optHash': '구도 유사도 임계값',
      'cull.optHelp': '시각만으로 묶으면 3초 안에 다른 것을 찍은 사진까지 같은 그룹에 들어갑니다. 초점거리와 구도 해시를 함께 써서 그 오류를 줄였습니다.',
      'cull.groups': '그룹',
      'cull.singles': '단독 컷',
      'cull.best': '베스트',
      'cull.markDelete': '삭제 후보로',
      'cull.marked': '삭제 후보',
      'cull.sharp': '선명도',
      'cull.rel': '그룹 내',
      'cull.exportTxt': '삭제 목록 (.txt)',
      'cull.exportSh': '삭제 스크립트 (.sh)',
      'cull.warn': '<b>이 도구는 아무것도 지우지 않습니다.</b> 브라우저에는 원본 파일을 지울 권한이 없습니다. 내보낸 목록을 확인한 뒤 직접 삭제하세요.',
      'cull.blurNote': '조리개를 열어 배경을 날린 사진은 화면 전체의 분산이 낮아 단순 점수로는 "흔들림"으로 오판됩니다. 화면을 타일로 나눠 가장 날카로운 부분만 보고, 다시 같은 그룹 안의 상대 순위로만 판단합니다.',

      'stats.title': '분석',
      'stats.lead': '내가 찍은 사진의 EXIF를 집계합니다. 어떤 설정에서 성공하고 있는지를 숫자로 보기 위한 것입니다.',
      'stats.focal': '초점거리', 'stats.fnum': '조리개', 'stats.iso': 'ISO',
      'stats.shutter': '셔터 속도', 'stats.hour': '촬영 시간대',
      'stats.body': '바디', 'stats.lens': '렌즈', 'stats.month': '월별',
      'stats.sharpTitle': '셔터 속도와 실패율',
      'stats.sharpLead': '선명도 하위 25%를 "실패"로 보고 설정별 실패율을 냅니다. 손떨림 한계가 숫자로 나옵니다.',
      'stats.failRate': '실패율',
      'stats.samples': '장',
      'stats.insightFocal': '가장 많이 쓰는 초점거리',
      'stats.insightFnum': '가장 많이 쓰는 조리개',
      'stats.insightHour': '가장 많이 찍는 시간대',
      'stats.insightLimit': '손떨림 기준선',
      'stats.csv': 'CSV 내보내기',
      'stats.csvNote': '내보낸 CSV는 <code>analysis/</code>의 Python / R 스크립트로 그대로 읽힙니다.',

      'frame.title': '액자',
      'frame.lead': '장비와 설정을 여백에 새긴 한 장을 내보냅니다. 폰트는 이 사이트와 같은 Quicksand + Playfair입니다.',
      'frame.style': '액자',
      'frame.style1': '미니멀', 'frame.style2': '필름', 'frame.style3': '다크',
      'frame.ratio': '출력 비율',
      'frame.ratioOrig': '원본 그대로',
      'frame.caption': '캡션',
      'frame.showCam': '바디', 'frame.showLens': '렌즈',
      'frame.showExp': '노출', 'frame.showDate': '날짜', 'frame.showPlace': '장소',
      'frame.place': '장소 (선택)',
      'frame.accent': '액센트 색',
      'frame.accentAuto': '사진에서 자동',
      'frame.wm': '워터마크',
      'frame.wmText': '서명 문자',
      'frame.wmImg': '이미지 사용 (PNG)',
      'frame.wmPos': '위치',
      'frame.wmAuto': '자동 (밝기로 판정)',
      'frame.wmColor': '색',
      'frame.wmSize': '크기',
      'frame.wmOpacity': '불투명도',
      'frame.wmInCaption': '액자 캡션 줄에 넣기',
      'frame.wmInCaptionNote': '액자를 쓸 때는 사진 위가 아니라 캡션 줄에 두는 편이 사진을 가리지 않습니다.',
      'frame.save': 'PNG로 저장',
      'frame.saveJpg': 'JPEG로 저장',
      'frame.pickFirst': '먼저 사진을 1장 선택하세요.'
    },

    en: {
      'nav.globe': 'Globe', 'nav.archive': 'Archive', 'nav.tools': 'Tools',
      'nav.about': 'About', 'nav.main': 'Main Portfolio ↗', 'nav.back': '← Shutterlog',

      'globe.eyebrow': 'Travel Archive',
      'globe.title1': 'Every place I walked,',
      'globe.title2': 'one frame at a time',
      'globe.lead': 'Drag to spin, scroll to come closer. The nearer you get, the more photographs appear.',
      'globe.hint1': 'Drag to rotate',
      'globe.hint2': 'Scroll to zoom',
      'globe.hint3': 'Click a photo to open the trip',
      'globe.scroll': 'Scroll',
      'globe.peekCta': 'Open this trip',
      'globe.fallbackTitle': 'The globe cannot render in this browser',
      'globe.fallbackBody': 'You can still browse every trip from the list below.',
      'globe.fallbackCta': 'Go to the trips',
      'level.0': 'WORLD', 'level.1': 'REGION', 'level.2': 'TRIP', 'level.3': 'CITY',

      'stats.countries': 'Countries', 'stats.cities': 'Cities',
      'stats.trips': 'Trips', 'stats.photos': 'Photos',

      'archive.eyebrow': 'Archive',
      'archive.heading': 'One album per trip',
      'archive.lead': 'Trips are ordered by when I went. Inside each album the default order is capture time, and you can re-sort by focal length, aperture or ISO.',
      'card.photos': 'photos', 'card.review': 'date to confirm', 'card.empty': 'photos coming',
      'card.cities': 'cities',

      'tools.eyebrow': 'Tools',
      'tools.heading': 'Automating my own photo workflow',
      'tools.lead': 'The work I used to do by hand after every trip, moved into the browser. Not a single photo is sent to a server — everything runs on your own device.',
      'tool1.title': 'Cull — find the shaken frames',
      'tool1.body': 'Groups near-duplicate frames using capture time, focal length and a perceptual hash, then nominates the relatively sharpest one. Deleting is always your call.',
      'tool2.title': 'Analyse — measure my own habits',
      'tool2.body': 'Distributions of focal length, aperture, ISO and hour of day, plus which settings I actually fail at. Export a CSV and dig further in Python or R.',
      'tool3.title': 'Frame — an EXIF border and a signature',
      'tool3.body': 'Three border styles that print the gear and settings in the margin. The watermark’s position, colour, size and opacity all adjust to the mood of the photo.',
      'tool.open': 'Open',
      'tools.pipeTitle': 'Four stages, one pipeline',
      'tools.pipeBody': 'These are not three separate features. They are one flow, from a folder of photos to a finished portfolio page: cull, analyse, frame, archive. The archive at the end is the globe at the top of this page.',
      'tools.privacy': '<b>Privacy:</b> all three tools run entirely in the browser. Nothing is uploaded and nothing is stored. Close the tab and nothing remains.',

      'about.eyebrow': 'About', 'about.heading': 'Why I built this',
      'about.p1': 'Photography is my hobby. Every trip leaves me with a few thousand frames, and picking the dozen worth showing was always the slowest part. This site is that selection-and-sorting work, automated and tied back to the data analysis I study.',
      'about.p2': 'The starting point was wanting to turn "this one feels good" into a number. Aggregate the EXIF of the frames I keep and it becomes obvious which focal lengths and apertures actually work for me — and where the limits are that instinct cannot see, like my failure rate below 1/60s.',
      'about.techTitle': 'Technical notes',
      'about.tech1': '<strong>Globe</strong>: three.js. Borders come from Natural Earth GeoJSON, painted into an equirectangular canvas in the browser and mapped onto the sphere. Visited countries are coloured from <code>trips.meta.json</code>, so adding a country adds a colour.',
      'about.tech2': '<strong>Markers</strong>: not 3D sprites — real <code>&lt;img&gt;</code> elements positioned by projecting 3D coordinates to screen space. The photos stay sharp and keyboard navigation just works.',
      'about.tech3': '<strong>EXIF</strong>: exifr in the tools, Python (Pillow) in the site generator. The same fields are read in both places, so <code>build.py</code> output and the tools agree.',
      'about.tech4': '<strong>Dependencies</strong>: no CDNs. Every library is vendored into the repository, and the page still works if one fails to load — a rule that came from a deploy where a CDN failure blanked the whole site.',
      'about.repoTitle': 'Repository',
      'about.repoBody': 'How to add photos, the folder naming convention and how to run <code>build.py</code> are all documented in the README.',
      'about.mainCta': 'Main portfolio',

      'trip.back': '← All trips',
      'trip.sortBy': 'Sort by',
      'sort.date': 'Capture time', 'sort.focal': 'Focal length', 'sort.fnum': 'Aperture',
      'sort.iso': 'ISO', 'sort.shutter': 'Shutter', 'sort.name': 'Filename',
      'trip.asc': 'Ascending', 'trip.desc': 'Descending',
      'trip.empty': 'No photos in this trip yet.',
      'trip.emptyHow': 'Drop JPEGs into the matching folder under <code>photos/</code> and run <code>python3 build.py</code> — they will appear here.',
      'trip.noexif': 'no EXIF',
      'trip.spots': 'Cities visited',
      'trip.of': 'of',
      'trip.close': 'Close',
      'trip.prev': 'Previous', 'trip.next': 'Next',

      'dz.title': 'Drop photos here',
      'dz.or': 'or',
      'dz.pick': 'Choose files',
      'dz.note': 'JPEG / PNG. Nothing leaves your device.',
      'dz.reading': 'Reading',
      'busy.exif': 'Reading EXIF',
      'busy.sharp': 'Measuring sharpness',
      'busy.hash': 'Computing perceptual hashes',
      'common.reset': 'Start over',
      'common.export': 'Export',
      'common.photos': 'photos',
      'common.download': 'Download',
      'common.none': 'none',

      'cull.title': 'Cull',
      'cull.lead': 'Groups similar frames and nominates the relatively sharpest one. Judgement and deletion stay with you.',
      'cull.optGap': 'Capture gap within a group',
      'cull.optFocal': 'Focal length tolerance',
      'cull.optHash': 'Composition similarity threshold',
      'cull.optHelp': 'Grouping on time alone sweeps in photos of something else taken within three seconds. Focal length and a composition hash cut that error down.',
      'cull.groups': 'groups',
      'cull.singles': 'single frames',
      'cull.best': 'best',
      'cull.markDelete': 'Mark for deletion',
      'cull.marked': 'marked',
      'cull.sharp': 'Sharpness',
      'cull.rel': 'in group',
      'cull.exportTxt': 'Delete list (.txt)',
      'cull.exportSh': 'Delete script (.sh)',
      'cull.warn': '<b>This tool deletes nothing.</b> A browser has no permission to remove your original files. Review the exported list and delete them yourself.',
      'cull.blurNote': 'A wide-open frame with a blurred background has low variance across the whole image, so a naive score calls it "shaken". This splits the frame into tiles, reads only the sharpest tile, and then ranks only within a group.',

      'stats.title': 'Analyse',
      'stats.lead': 'Aggregates the EXIF of your own photographs — a way of seeing, in numbers, which settings you actually succeed with.',
      'stats.focal': 'Focal length', 'stats.fnum': 'Aperture', 'stats.iso': 'ISO',
      'stats.shutter': 'Shutter speed', 'stats.hour': 'Hour of day',
      'stats.body': 'Body', 'stats.lens': 'Lens', 'stats.month': 'By month',
      'stats.sharpTitle': 'Shutter speed vs failure rate',
      'stats.sharpLead': 'The bottom 25% by sharpness counts as a failure. This gives the failure rate per setting — your handshake limit, as a number.',
      'stats.failRate': 'failure rate',
      'stats.samples': 'frames',
      'stats.insightFocal': 'Most used focal length',
      'stats.insightFnum': 'Most used aperture',
      'stats.insightHour': 'Most active hour',
      'stats.insightLimit': 'Handheld limit',
      'stats.csv': 'Export CSV',
      'stats.csvNote': 'The exported CSV is read directly by the Python / R scripts in <code>analysis/</code>.',

      'frame.title': 'Frame',
      'frame.lead': 'Exports a print with the gear and settings set into the margin. Same typefaces as this site: Quicksand and Playfair.',
      'frame.style': 'Border',
      'frame.style1': 'Minimal', 'frame.style2': 'Film', 'frame.style3': 'Dark',
      'frame.ratio': 'Export ratio',
      'frame.ratioOrig': 'Original',
      'frame.caption': 'Caption',
      'frame.showCam': 'Body', 'frame.showLens': 'Lens',
      'frame.showExp': 'Exposure', 'frame.showDate': 'Date', 'frame.showPlace': 'Place',
      'frame.place': 'Place (optional)',
      'frame.accent': 'Accent colour',
      'frame.accentAuto': 'From the photo',
      'frame.wm': 'Watermark',
      'frame.wmText': 'Signature text',
      'frame.wmImg': 'Use an image (PNG)',
      'frame.wmPos': 'Position',
      'frame.wmAuto': 'Auto (by brightness)',
      'frame.wmColor': 'Colour',
      'frame.wmSize': 'Size',
      'frame.wmOpacity': 'Opacity',
      'frame.wmInCaption': 'Place it in the caption line',
      'frame.wmInCaptionNote': 'With a border on, the caption line keeps the signature off the photograph itself.',
      'frame.save': 'Save PNG',
      'frame.saveJpg': 'Save JPEG',
      'frame.pickFirst': 'Choose a photo first.'
    }
  };

  var LANGS = ['ja', 'ko', 'en'];
  var KEY = 'shutterlog.lang';
  var cur = 'ja';
  var listeners = [];

  function detect() {
    try {
      var s = localStorage.getItem(KEY);
      if (s && T[s]) return s;
    } catch (e) { /* 프라이빗 모드 등 — 기본값으로 갑니다 */ }
    return 'ja';
  }

  function t(key) {
    var d = T[cur] || T.ja;
    return (key in d) ? d[key] : (T.ja[key] !== undefined ? T.ja[key] : key);
  }

  /* HTML 을 허용하는 키가 있으므로 innerHTML 을 씁니다.
     이 값들은 전부 이 파일 안에 있는 우리 문자열이며 사용자 입력이 아닙니다. */
  function apply(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], v = t(el.getAttribute('data-i18n'));
      if (v == null) continue;
      if (/[<&]/.test(v)) el.innerHTML = v; else el.textContent = v;
    }
    var attrs = root.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < attrs.length; i++) {
      var e2 = attrs[i];
      var pairs = e2.getAttribute('data-i18n-attr').split(',');
      for (var j = 0; j < pairs.length; j++) {
        var kv = pairs[j].split(':');
        if (kv.length === 2) e2.setAttribute(kv[0].trim(), t(kv[1].trim()));
      }
    }
    document.documentElement.lang = cur;
  }

  function set(lang) {
    if (!T[lang]) return;
    cur = lang;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    var btns = document.querySelectorAll('.lang-switch [data-lang]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-lang') === lang ? 'true' : 'false');
    }
    apply(document);
    for (i = 0; i < listeners.length; i++) listeners[i](lang);
  }

  function bind() {
    var btns = document.querySelectorAll('.lang-switch [data-lang]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () { set(this.getAttribute('data-lang')); });
    }
  }

  /* 다국어 객체({ja,ko,en})에서 현재 언어를 꺼냅니다. 데이터 파일용. */
  function pick(obj, fallback) {
    if (!obj) return fallback || '';
    if (typeof obj === 'string') return obj;
    return obj[cur] || obj.ja || obj.en || obj.ko || fallback || '';
  }

  global.I18N = {
    get lang() { return cur; },
    langs: LANGS, t: t, set: set, apply: apply, bind: bind, pick: pick,
    onChange: function (fn) { listeners.push(fn); },
    dict: T
  };

  cur = detect();

})(window);
