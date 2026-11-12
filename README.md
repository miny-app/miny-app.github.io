# miny-app.github.io

GitHub Pages로 배포하는 단일 HTML 페이지 모음입니다.

- 사이트: https://miny-app.github.io/
- 배포: `main` 브랜치 루트를 GitHub Pages가 그대로 배포합니다. 빌드 과정은 없습니다.

## 페이지 추가하기

1. `<app-name>/index.html` 폴더와 파일을 만듭니다. 주소는 `https://miny-app.github.io/<app-name>/`가 됩니다.
2. 루트 `index.html`의 `#pages` 목록에 링크를 추가합니다.
3. 커밋하고 `main`에 push하면 1~2분 뒤 반영됩니다.

## 주의사항

- 파일은 상대경로로 참조합니다 (`./style.css`). `/style.css`처럼 쓰면 사이트 루트를 가리킵니다.
- 모든 페이지가 같은 origin(`miny-app.github.io`)을 공유하므로 `localStorage` 키에 `<app-name>:` 접두사를 붙여 충돌을 피합니다.
- `.nojekyll` 파일이 있어서 Jekyll 처리를 하지 않습니다. `_`로 시작하는 파일과 폴더도 그대로 배포됩니다.
