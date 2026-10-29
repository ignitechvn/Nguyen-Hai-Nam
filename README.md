cratedigger.js
===========

3D vinyl records exploration & crate digging plugin, using WebGL with Three.js.

[![cratedigger.js demo](https://github.com/risq/cratedigger/blob/master/src/images/demo.gif?raw=true)](http://risq.github.io/cratedigger.js)

**demo** : [http://risq.github.io/cratedigger.js](http://risq.github.io/cratedigger)


Screenshots
-----------

![cratedigger.js screenshot #1](https://github.com/risq/cratedigger/blob/master/src/images/screenshot1.png?raw=true)
![cratedigger.js screenshot #2](https://github.com/risq/cratedigger/blob/master/src/images/screenshot2.png?raw=true)


Portfolio Nguyễn Hải Nam
-----------

Thùng có 7 đĩa, mỗi đĩa là một mục menu (một "Page" trong file nội dung; trang HOME hiển thị là About Me). Bìa đĩa là chữ: tên mục và danh sách các phần như tracklist; lật đĩa mở trang của cả mục. Mỗi dòng trong file nội dung `content/Website_Layout_Hai_Nam.xlsx` (không đưa lên GitHub vì có link Drive nội bộ — đặt file vào đúng đường dẫn này để cập nhật) là một phần trong trang của mục đó. Chọn đĩa (cuộn chuột, kéo, phím mũi tên, menu chuyên mục) rồi bấm Open record / click lần nữa để lật đĩa và đọc nội dung. Web chỉ dùng tiếng Anh (cột Content [ENG]).

Cập nhật nội dung:

    pip install openpyxl
    python3 tools/xlsx_to_json.py      # xlsx -> src/content.json
    npm run build

* Tiêu đề lấy từ cột Breakdown (`Vai trò | Tên dự án`, dòng sau là mô tả ngắn), chuyên mục lấy từ các dòng `... Page: ...`.
* Các dòng ghi chú cho người thiết kế như `[Insert ảnh ...]` được tự động bỏ qua.
* Link trong cột "Yêu cầu hình ảnh" (nền tảng, bài nghiên cứu, fanpage, công ty) thành nút bấm cạnh tiêu đề.
* Ảnh: lưu trong `src/images/photos/<mục>/` và khai báo trong `content/photos.json` (khoá = phần đầu tiêu đề mục, `layout`: `interleave` xếp xen kẽ với đoạn văn / `end` đặt sau nội dung, `caption` là chú thích). Nén ảnh trước khi thêm: `python3 tools/optimize_photo.py anh-goc.jpg src/images/photos/<mục>/06.jpg`. Mục Honors & Awards dùng lại ảnh chứng nhận đã có (khai báo trong `content/photos.json`).

Chạy & build
-----------

    npm install
    npm start        # dev server tại http://localhost:3000
    npm run build    # xuất ra thư mục lib/ — upload lên GitHub Pages, Netlify, Vercel...

Using with npm
-----------

Install cratedigger.js :

    npm install --save cratedigger.js

Use the library in your app :

`````javascript
var cratedigger = require('cratedigger.js');
cratedigger.init(options);
`````


Building & testing
-----------

Clone repo :

    git clone git@github.com:risq/cratedigger.js.git cratedigger.js
    cd cratedigger.js

Install dependencies :
    
    npm install
    
Build vendors & assets :

    npm run build
    
Run cratedigger.js (with browsersync & watchers) :
    
    npm start
    
Build  :

    gulp build
    
Enjoy !!

Deploy
-----------

* **GitHub Pages**: Settings → Pages → Source: **GitHub Actions**. Deploy chạy thủ công: tab Actions → "Deploy to GitHub Pages" → **Run workflow** (push lên `main` không tự deploy).
* **DigitalOcean droplet** (Ubuntu, nginx): lần đầu chạy trên droplet
  `curl -fsSL https://raw.githubusercontent.com/ignitechvn/Nguyen-Hai-Nam/main/deploy/setup-droplet.sh -o setup.sh && sudo DOMAIN=hainamnguyen.com EMAIL=you@example.com bash setup.sh`
  (bỏ `DOMAIN`/`EMAIL` để chạy bằng IP). Cập nhật sau này: `sudo bash /opt/portfolio/deploy/update.sh`.
* **Vercel / Netlify**: Import repo, cấu hình đã có sẵn trong `vercel.json` / `netlify.toml` (build `npm run build`, thư mục `lib`).
