cratedigger.js
===========

3D vinyl records exploration & crate digging plugin, using WebGL with Three.js.

[![cratedigger.js demo](https://github.com/risq/cratedigger/blob/master/src/images/demo.gif?raw=true)](http://risq.github.io/cratedigger.js)

**demo** : [http://risq.github.io/cratedigger.js](http://risq.github.io/cratedigger)


Screenshots
-----------

![cratedigger.js screenshot #1](https://github.com/risq/cratedigger/blob/master/src/images/screenshot1.png?raw=true)
![cratedigger.js screenshot #2](https://github.com/risq/cratedigger/blob/master/src/images/screenshot2.png?raw=true)


Nội dung từ Google Sheet
-----------

Dữ liệu đĩa được tải trực tiếp (trong trình duyệt) từ Google Sheet:
https://docs.google.com/spreadsheets/d/1MhcQlLpq3R2AkJyeuELQd2zKKj9xx3BiY7i2gf-7RF0

* Sheet phải được chia sẻ **"Bất kỳ ai có đường liên kết đều có thể xem"**, nếu không trang sẽ hiển thị dữ liệu mẫu.
* Đổi sheet: sửa `SHEET_ID` trong `src/index.js`, hoặc thêm `?id=<sheetId>`, `?sheet=<tên tab>`, `?gid=<gid>` vào URL.
* Dòng đầu tiên là tiêu đề cột. Các cột được nhận diện tự động (tiếng Việt hoặc tiếng Anh, có dấu hay không dấu):

| Trường | Tên cột chấp nhận (ví dụ) |
|---|---|
| Tiêu đề | `Title`, `Tên`, `Tên bài hát`, `Album` |
| Nghệ sĩ | `Artist`, `Ca sĩ`, `Nghệ sĩ`, `Tác giả` |
| Ảnh bìa | `Cover`, `Ảnh`, `Ảnh bìa`, `Hình ảnh`, `Image` (link ảnh, link Google Drive hoặc YouTube) |
| Năm | `Year`, `Năm` |
| Mô tả | `Description`, `Mô tả`, `Ghi chú` |
| Link | `Link`, `URL`, `YouTube`, `Spotify` |

  Các cột khác vẫn được hiển thị trong bảng thông tin khi lật đĩa. Không có ảnh bìa → bìa được tạo tự động từ tiêu đề/nghệ sĩ.
* Mỗi thùng chứa 24 đĩa, số thùng tăng theo số dòng (tối đa 6 thùng = 144 đĩa).
* Ảnh bìa dùng làm texture WebGL nên máy chủ ảnh phải cho phép CORS (Google Drive, imgur, i.ytimg.com đều được); ảnh không cho phép CORS vẫn hiện trong bảng thông tin nhưng trên đĩa 3D sẽ dùng bìa tự tạo.

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
