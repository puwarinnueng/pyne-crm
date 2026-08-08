/**
 * PdfExport.gs — สร้าง Consent Form เป็น PDF จริงใน Google Drive
 *
 * เลย์เอาต์ตามตัวอย่าง consent-PYN-*.pdf: หัวแบรนด์ + โลโก้, การ์ดสองคอลัมน์, รูป/ยินยอม/ลายเซ็น
 * สร้างจาก HTML blob แล้วแปลงเป็น PDF เพื่อไม่ต้องขอ scope Google Docs เพิ่ม
 */

var PDF_CONSENT_TH_ =
  "ข้าพเจ้าขอยืนยันว่าได้อ่านและเข้าใจข้อมูลทั้งหมดที่ระบุในแบบฟอร์มนี้อย่างครบถ้วนแล้ว " +
  "และยินยอมให้ทาง Pyne Studio ดำเนินการบริการตามที่ระบุข้างต้น โดยได้รับคำอธิบายจากช่างผู้ให้บริการเป็นที่เรียบร้อย";

var PDF_CONSENT_EN_ =
  "I confirm that I have read and understood all information stated in this form and consent to the service as described above, " +
  "having received full explanation from the technician.";

var PDF_LOGO_DATA_URI_ = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAP8AAABaCAMAAABAB3ClAAAA/1BMVEWcbGCUcFJ3WVOeYCKakmSPbFH/f38/NABaPzR4Wh1/AH8A/wAAAABnTi1sUjB/fwBVVVV8PT1nTi1nTS2adVhnTi1nTi1nTi1/f3//AABnTi1nSyyadFiYc1eqVVVqUy5oUC1VVQBoUC0/Pz9/fz+ZdFiZdFeYdFiYc1f//wCXdViiel2qqlVpUC5/AABoUC2Sa1JpUC5pUC5dPh5lZTKqgWJcSi2lelhVVSyVblX///+bd2O9f3unfmAAfwC/fz8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAd0Qa6AAAAQHRSTlMR4wYECF4CBQoIAgEA/P0CAwTPMfBPbq8CAY8T0i4DEmwDLwQEr49uUAET+wPTAlAQsJUIBf8NCwYkAQwE/wIEAtxKmAAAERBJREFUeNrdXOd62zoSVdotuyDBXkRSVC9Ud4ntlJv3f6udAVgAdsrOft7Fj8SWWHBmzlQAHhE+TjohPskH/EZMe2wYCg7DcKfnGD7SZqQy9NLwSduYiZdqpS99fUHkOcTn6Xg8vhtP7XmAn2ka6TOoxu51XENRYQACd2oyALR05Yhfjh8X2ODuwHHZrflQFNeBKVBKftOgC+nRMJvYdhWleL9xZ8ME/Fn3k+BBwZTPH3QHg/1ouHZcATAiOvsgdozjnHjpqwMHbz26U8e2bWecilFVryYTDhEkNb2CghxnisMBZV0d0qIj3XXTq9m1c8Jno6WTsKc0hx9Pjxw3lwH/525O0kk2D3i9eaewq+35V/bRvWmzT1S8Xyvr/8Hkwjqzr4C/NrzZnc6FywL7DqfCJSBI8ETMoyoPm7RQRHMM4dJrXFwazJFxSsB/27E5KMbYNk1zbjvukUkC77FJm4Dx5eaVqdvhzzr53CJjh80UZC4wnYyCVLvw8Dl+QcnzGNDPuVrYWLD3BVMugbuAyBScciWxoRp/dbHTza5W73Ls53HKVsVEADDhcaqsbNzbVyXlAkxAa1E+dRhZpqB5LTcpio4jGCMARbp/FCgpyRTVBGCUfIUJTuEbyRx9vD9mU1ePpvh+CqoqBKA6JG5Fr5N7I33dmMyYZib4gOwROAef/OVyRQGCGaVUY55ynkquNIHS41H5CrKQLCrf8ZmqR4GiIxJc01erzBoDQzVMcqq+wIf7HU5Cm8h+2i7w26TDQ+v8IYrq5g+hupPBZ/dTHeCPZ7IGZhq+PqWAXQHHxyJFCKrU66XDv3byYDeiRD8W+vcCF8Wr1z79tOBI8X5deuxY7Y2fkjk3lMATIqUt4NfBROANtOzo4QO7EIBWi68VPng6EADnHk29wogJJcOPSBpvFpUnCYDSQFFz/utdDoBdDGTTxOdm3LbBfkDN49rHPGRywknS5tnZjZPIL7meZpn/z14Oz0T52W0IMlXDVZ9Ep5Prb9yF/x+GvyQnzc90cCbIUbeB3w/p9IE+Oq26PlvtnEMOdsxfMSrsF1QSoFnqrakFV7WqzsU4rOX6MyZdyQkx8bKZzN8d4V4R8D8bGAVp0/Qz71lJMzxu3BhD6anx9dlV2QNGGA3NTP+g3NinvdyXEcwkUFkQmXc4gAU5qzzUNBiWo7YYkZYbq1KOM7PYyB6xaM2Oxrm5ewy/T1Kdml/x5g4Fnv42MgJp4lOdPKotWu+foItxy0LKueuAgo2AtugvY9q0nImmlgmC8VvxZxI0aIY/5vjnTgvzCv05ufyKCfg0kz68/p/WB3xlxkObbBeING2hEKMPn74Es4A17ozARu5rFpL+jR43Y8abujpX9gB2bpiLVvs5qzVvyfEbbp4DN4xYyeVPRcdk5BFk0VEe5L4KcjcBPyaCJulRYBp1pk5JToA2D8L4G1dIVkQQTIvb8/urWg21i1z8Skz6JWA84Rfxg0Seu9Hn95cJ0IeAiLPORYj421Mo8fWakIUbuVnQ3vghUMr4x13eTw72EgMzXtWpV1Z/Te4iPFT5u9/rAanw4VzNrZL2nj9cK+M/d9iOkMBVTJ2SQFU7CDDh6tfaJ6V15g9lpudBDV/+QFvHRyhYsyfcy/Zfp5k6CeZcm/mSa04jULMXaVK/iL8jg6aZA0Q/eSo7RSVt+LSOvFqHqQjxD/A89GlUaUUJL0Hx/ew5TSpEmtazQzKqDhecY83fPsvpryjqkGHL+N1e6l8UZCtl8blrmpPZIPULVg1abe+gYgLBX59nEYVLA/7zVlzbcNIxhRbXiFuU2it3y942LYxN0lWeBLm1TTpUUwM3BK/WGYIy/IWUdaGpNB/WdZXw9yhe5QBiNKGw60nuqg3UmNV59S78QhFh5PjNxVe951joJxn/uU/2U+QaSiVVo0FKAONEaz13k2uY5dlDtw1qRkXIuUkoPV14vf5tMuvl/0T8p94E0Lj1z7rwa33zz+wdvuj+O91HC/55v/An9PvKd3haRoBKfwIbX4CuXsI34c+yFfbkIin43fiFaFOp9lvKII331rS3wz99K/zp7ao5GH+F5qdZRoCvtE79lLwd/sxdS/hfw39zKP+r+BcCAbSK8zebHMyr8Evp33D9F+8ebP91d2QhQI4NrdZ/I/67HH8g4j/djN98tf8TCSBlU8z6mytbEf+pL/6iz+sL8X9w/Cve3S/+CflfrbXdG9U6OI39lHTiN/r3X/LsU6hIuhdgJGX5Ev5++Y+Y/+ltDUIhO2bqb2kNvw6/vACl36z/fvmvUP/UGqsfVDp0rDfQltndhN8t6p9zUf8MwB87sYR/3Ev/BdvqBVbToWLqb2PX6/Cna4oDatjsncZo4LulaqPJ2OJShcJ6FoZ/Im+LX7iU5lMy7vtqH/XkjkprKn2C54PS3mvNzTEjQKr+SRv+vP5b3IBfcABDCiBXtUdSPdPHARZkU69Nl+cegBHkxNTfOi2a5ZS34aeZCoWsuBsH3BOPhq3eStsdGlVarLEZ2AhZ8Niv9xFqN35arF8IPndnqAMdAE7SJTJ+Q+93n9LeLjwVy6EgIm792om8NX7B/IQIoPTLYmHFTuH9PzGf7bP+ExidK12ijCj6GXjTnz3xa/3xBzWz6lqAE6O4EZfxd2ffwvrpfVuTWs09AI27V2UE/B+H6J9Weq89VsDyVvSUrf+I+Xx3CVSo1m5d58oJEHD1L3ri71j9bMIPO9wGEUDTcJ2dcP0XtgMEaF8Bo1l2104Vr1iQcrQei3K98O/K+EVlCUtgsAGEyvfUbKRJyzFR/2zvVIcH0IVtBrTfKnNH6tcbv1dJv0rrj07vMMZcElPgqKhY2do7br7w2+aZLfJ11Flik7Rb/UL+15KDJanuGtJPIS9Pg+0uv6dunxxToIQffWj7Bqh8+1SnjfnUGFCTCj6ooYE1IWsrAQ6chGbHVJqqT/PIBMxYYFIwWlmXigmAcdhq1owQ8SvPTAAArUkD2f6zHomStErSGZCFFax6D7wk68cw2flSqleaBZDzWAhAJweyegwntLoNFnYsZwqU8Ae4mxsF0NAH0Ysddp1pwj9FFdSjJeEV3D2fakR7IBvL2sJ/RD8Va31GiSozSQBPwBi4Z1LeHB+4wv5DGb/Pdj+r4/vqQQkmOCfbPkv754kNi4GVaFxEIL3m+8gKV+w54lpfxQfP8t3MyO+tZa0k0eOxEOooqrDDTsJvAs0QI24BTg+FiPu/gzu+/9vulWBpxbbCzpROmxlFCDZJOa/eed/D0IoQ/0NB/zozpOQ0zvYIX0MrvDwvU4qc2BmLxfmoSvunR+KWMognsHeJHR+4MxmGhbj/X8n2//crsPhCXR/1E6F8ZdT1yuwHJm+Q/fn2zTzVKbtdfnoDv/xgffiSTiTV5JyfvrgKBwBG8o4+yizkjE9wbWEpGU4oKGxf/fFM+jYYT4ypfUqK+K68LeEku37G5CU+0i7tYBgH1VB6z07vqHt4+9UxA0aRIDinJ4KO0gGSkdiv4u0akMEzOysCp6bGuE+gOP9j4L391xd4OO3wFX5Rugi81kT2J+E+TLwdPInzRNjIgkksLQsAzg4ZqvWB7wbB02uukSE42jo5nYiMf1rq/8K/z2e3vJXkyM6jzAgZhL+H+gPTDIL4Ph1xYM7NEvv3YPzMj5vzII7vtazRGsexGdeegPrzwz49NiYcYTuO56R6/qmKn1+D5/+U4vwcO4A3oLfO2oAD2pHNfjSy9htkf/+xJNu99cW+czkApMx1PJ3TKgIJv5hPMZ+hBXP7bM/NmHm8xWzQeT5M6fttKKXZaQy+jYpKZ/S0H+HjKoMPX/lyllknXowXj2v86TmYz+EAmRlzluizmv5/gV9uZ9PFQjy3qQ3U24LXGK9V/5JsHsPvy4mHYwLjsOSjpU4Fi3lceRC5qHS2lNavf9TrP71rpi00jfo3TPwE5t+84NvoDRk0gFpUPdb+ZbDF7MMLl7xPZ5o2awYg4R/3jew905+WBd9+wpgsk6fVfvsUpWOLY5OORo9w2IX7qKer+o34DXXoYixwJlnBCNNhVUf6DVy0/thoMV8ee/vLUc1yxVsMnZ/iGvi8CYkydOs16ngLmQ/T/EuSPF2evv/qXqChu8Ra9Q4XJfyv8FbSrX8i+43Ye7Uc1z+3Fe/+bTdZHhr935Ks9pHv/dfxy+SPb3F+kN+zef9IfXyCRf/kF/P9u93O9/1+8WKNpUJd56wD//E1mE2SZ+06prQQTT8Nhg8T2m4vKck9stlXCvhuC9pbiU/JLfo3glvB76Dh7xL8WwJQZxJ2KP4GZ+KB+e9/PvJKF5M4a78i3rAnJCE4v4kcUldR41PY+ndtQ324u7umqTj76wnH+LS7IdO11tstn+4EfwNRHAYoAW5agfrFk8VkuVtb33ct+pcayrNbnR/2jY5T82tsjrHsOQbDRUlJWKQ6oElrDY68wv5vjYZPyEdoFJRrBWidRelcdl4t/njI6eWWQ71K9jcaboMP7Ie5XyaHP5gsAP56H1Xwe82LA5996BKG1mUnu8lL4Rvq9E+p2HujN9I/S6G4CK7BDURC/NvJIdNUuErA+qvsv1xqoMDvm9Baba3tfiPdc4BKcOsd+DWX6FBeTxqRZ6H51Hb2vbvVkzewHHKLHH3y3Vqn3AU7DjGOl32o7kV7uMaraPESWuuNtY/W1pOYIvmjHyEsG8Bsdp/Ilw8QGb5lJSJPIEa62FFjPvxm+qfosXl6S8HElzhYBuDBT5fo57qsZxAOpvYfQanrf2c+bQefRtYqAYvZEEu650DJ9hEjqA+Kxybalix//VhO+K1JgpKbH8WG4l18o/fP6H906K1ZtLe7WCx1+czWejCN00p1bbICoXwGKKjVHSuRAO5oA46SvAD8regx4IePm31IJh5IKIEWqrWCS9KqMtqssKk0cstnotyADA1c/yLZU67QXrs9iTzw+X8CNxYRJLpWcnGgQisZoZ+IrGR34BxO1tggAQpsiLey8hwRvwKfAC4FHMYF4gKEE8C82ayxwILlhHWE/B/fsfNQNv6hI97sHIwfO5hH6DKO7Xhoi6xiAbDKkTD4FesHwa6tLbgFjAyANuLecLuyVvjhBuBPlpkDYR5vG4bbdcgkZK3W4BhBHBbWVpttFHlC/H+D8RAXf3jrFc0efwsLlgh/Eu3ltZsfWBpGZB0mWwD5CWSQRMDhMAQ1hptoFUYsYwIDJ4wWHzdhuLmAG30BCYVbdCjwabgu6MS86Cj9G0cajEXtHyXrn77omv9KKUIItJINgLiU1A/+C2GDWEJcCQH1blmhvGEcBoDrBMwcWcErKIgD4SYmuwNYDEqIeEAsJEkyWS5/YIOJvK3+32Z4XgRWGsHSZSJl/h7nN+Zvl2iZpoBRwrN7jzyNJmg7LIGAj142qHGNsETggld5T0CE6AUf/UdN/vtuxhPZ/oQ5An/XPyVHvkBn/SvNfid5HjjJM4GDz5LG9R7bRkzjPA1CVwYXfYPIAXR5IR55v/j9P0j04cMFsSRWWISRJWQ30M/kmVHR2fB2NUkxdAe3o8wBMgHkVz19r8me3xF+RnIogD6xHsY2T2MPmN2QQW2AZbVK2AFz/qivf94LfKAoj18+Ca3PaSD3fGb6fdsAE+yeN9DLb6p/38P4BiRfgX8GVnss91lmGe8ae0D+b3rte8EP9S54Lb7MCfRPvZ/HGsIvwxb//ifxe8sVVq/M6H+Byn+A58bCZoNR//fBfy/4d+jxw7TXicWvp02wrFuBSIhH/u/xYzqzpamPZ8U/YUXL6vI7lf/e8p9J3sKHAm8L6KNhYe9/Gv+k6E35yQqLdUS/+81v/Q/G6Cf79DsBhQAAAABJRU5ErkJggg==";

function pdfFormTypeLabel_(formType) {
  if (formType === "form1") return "สักคิ้วครั้งแรก";
  if (formType === "form2") return "สักทับรอยเก่า";
  if (formType === "form3") return "เติมสีคิ้ว";
  return "";
}

function pdfStatusLabel_(status) {
  var key = normalizeVisitStatus_(status);
  if (key === "draft") return "แบบร่าง";
  if (key === "in_progress") return "ทำค้างไว้";
  if (key === "completed") return "เสร็จแล้ว";
  if (key === "not_served") return "ไม่ได้รับบริการ";
  return key || "-";
}

function pdfDateTime_(value, pattern) {
  if (!value) return "-";
  var date = Object.prototype.toString.call(value) === "[object Date]" ? value : new Date(Number(value));
  if (!date || isNaN(date.getTime())) return String(value);
  return Utilities.formatDate(date, "Asia/Bangkok", pattern || "d MMM yyyy HH:mm");
}

function pdfEscape_(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function pdfValue_(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value === undefined || value === null || value === "") return "-";
  if (value === "agreed") return "Agreed";
  if (value === true) return "ใช่";
  if (value === false) return "ไม่";
  return String(value);
}

function pdfPick_() {
  for (var i = 0; i < arguments.length; i++) {
    var v = arguments[i];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && !v.length) continue;
    return v;
  }
  return "";
}

function pdfKvRow_(label, value, isLast) {
  var display = pdfValue_(value);
  if (display === "-") return "";
  return (
    '<tr class="kv' + (isLast ? " last" : "") + '">' +
      '<td class="k">' + pdfEscape_(label) + "</td>" +
      '<td class="v">' + pdfEscape_(display) + "</td>" +
    "</tr>"
  );
}

function pdfCard_(rows) {
  var html = "";
  var kept = [];
  for (var i = 0; i < rows.length; i++) {
    if (pdfValue_(rows[i][1]) !== "-") kept.push(rows[i]);
  }
  if (!kept.length) {
    return '<div class="card"><div class="empty">—</div></div>';
  }
  for (var j = 0; j < kept.length; j++) {
    html += pdfKvRow_(kept[j][0], kept[j][1], j === kept.length - 1);
  }
  return '<div class="card"><table class="kv-table">' + html + "</table></div>";
}

function pdfSectionTitle_(th, en) {
  return (
    '<div class="sec-title">' +
      '<span class="bar"></span>' +
      '<span class="sec-text">' + pdfEscape_(th) +
        (en ? ' <span class="en">· ' + pdfEscape_(en) + "</span>" : "") +
      "</span>" +
    "</div>"
  );
}

function pdfExtractDriveFileId_(url) {
  if (!url) return "";
  var s = String(url);
  var m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return "";
}

/** แปลง URL รูป/ลายเซ็นจาก Drive เป็น data URI — HTML→PDF ของ Apps Script ดึง thumbnail ภายนอกไม่เสถียร */
function pdfEmbedDriveImage_(url) {
  if (!url) return "";
  if (String(url).indexOf("data:") === 0) return String(url);
  var fileId = pdfExtractDriveFileId_(url);
  if (!fileId) return "";
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    var bytes = blob.getBytes();
    // กัน HTML บวมเกิน — ถ้าใหญ่เกินข้าม (โชว์ช่องว่างแทน)
    if (bytes.length > 450000) return "";
    var mime = blob.getContentType() || "image/jpeg";
    return "data:" + mime + ";base64," + Utilities.base64Encode(bytes);
  } catch (e) {
    return "";
  }
}

function pdfPhotoCell_(url, label) {
  var src = pdfEmbedDriveImage_(url);
  var inner = src
    ? '<img class="photo" src="' + src + '" alt="' + pdfEscape_(label) + '">'
    : '<div class="photo-empty">ไม่มีรูป</div>';
  return (
    '<td class="photo-cell">' +
      '<div class="photo-frame">' + inner +
        '<div class="photo-tag">' + pdfEscape_(label) + "</div>" +
      "</div>" +
    "</td>"
  );
}

function pdfSigCell_(url, caption, sub) {
  var src = pdfEmbedDriveImage_(url);
  var inner = src
    ? '<img class="sig-img" src="' + src + '" alt="signature">'
    : '<div class="sig-empty">ยังไม่มีลายเซ็น</div>';
  return (
    '<td class="sig-cell">' +
      '<div class="sig-frame">' + inner + "</div>" +
      '<div class="sig-line"></div>' +
      '<div class="sig-cap">' + pdfEscape_(caption) + "</div>" +
      (sub ? '<div class="sig-sub">' + pdfEscape_(sub) + "</div>" : "") +
    "</td>"
  );
}

function findPdfVisit_(serviceId) {
  var rows = sheetToObjects_(getServiceHistorySheet_());
  var row = rows.find(function(r) { return String(r.ServiceID || "") === String(serviceId || ""); });
  return row ? rowToVisit_(row) : null;
}

function findPdfCustomer_(customerId) {
  var rows = sheetToObjects_(getCustomersSheet_());
  var row = rows.find(function(r) { return String(r.CustomerID || "") === String(customerId || ""); });
  return row ? rowToCustomer_(row) : null;
}

function getPdfExportFolder_(customer, visit) {
  var customerName = customer ? (customer.fullName || customer.nickname || "") : "";
  var customerPhone = customer ? (customer.phoneNormalized || customer.phoneDisplay || "") : "";
  var visitKey = visit.serviceId || todayDateString_();
  var serviceName = visit.serviceType || pdfFormTypeLabel_(visit.formType) || "service";

  var root = getDriveRootFolder_();
  var exportRoot = getOrCreateSubfolder_(root, "_exports").folder;
  var customerFolderName = sanitizeFolderName_((normalizePhone(customerPhone) || "unknown") + "_" + customerName);
  var customerFolder = getOrCreateSubfolder_(exportRoot, customerFolderName).folder;
  var visitFolderName = sanitizeFolderName_(visitKey + "_" + serviceName);
  return getOrCreateSubfolder_(customerFolder, visitFolderName).folder;
}

function createConsentPdfHtml_(customer, visit) {
  var raw = visit.rawAnswers || {};
  var formLabel = pdfFormTypeLabel_(visit.formType);
  var customerId = (customer && customer.customerId) || "-";
  var agreedAt = visit.consentAgreedAt || raw.agreedAt;
  var finalAgree = raw.finalAgree || raw.consentAgree;
  var exportedAt = pdfDateTime_(Date.now(), "d MMM yyyy · HH:mm");
  var logoSrc = PDF_LOGO_DATA_URI_;

  var patientCard = pdfCard_([
    ["Customer ID", customerId],
    ["ชื่อ-นามสกุล", customer && customer.fullName],
    ["ชื่อเล่น", customer && customer.nickname],
    ["วันเกิด", customer && customer.dob],
    ["โทรศัพท์", customer && (customer.phoneDisplay || customer.phoneNormalized)]
  ]);

  var visitCard = pdfCard_([
    ["ประเภทบริการ", visit.serviceType],
    ["ฟอร์ม", formLabel],
    ["วันนัด", pdfDateTime_(visit.visitDate, "d MMM yyyy")],
    ["เวลานัด", visit.timeSlot],
    ["สถานะ", pdfStatusLabel_(visit.status)]
  ]);

  var consultLeft = pdfCard_([
    ["ลักษณะรอยเก่าปัจจุบัน", pdfPick_(raw.oldMarkLook)],
    ["สีรอยเก่า", pdfPick_(raw.oldMarkTone)],
    ["จุดที่ต้องการแก้ไข", pdfPick_(raw.fixPoints, raw.changeItems)],
    ["แผลเป็น", pdfPick_(raw.hasScar, raw.scarCause)],
    ["จุดที่ต้องการ", pdfPick_(raw.desiredArea, raw.concerns)]
  ]);

  var consultRight = pdfCard_([
    ["แพ้ / ข้อมูลสำคัญ", pdfPick_(raw.allergyInfo, raw.allergyDetail)],
    ["ภาพรวมที่ต้องการ", pdfPick_(raw.desiredOverview, raw.desiredFeel)],
    ["สิ่งที่ไม่อยากได้", pdfPick_(raw.notWanted, raw.dontWant)],
    ["สีที่เลือก", pdfPick_(visit.colorUsed, raw.colorChoice)]
  ]);

  var rxLeft = pdfCard_([
    ["Technique", pdfPick_(visit.technique, raw.technique)],
    ["Color", pdfPick_(visit.colorUsed, raw.colorChoice)],
    ["Intensity", pdfPick_(visit.intensity, raw.intensity)],
    ["Muscle", pdfPick_(visit.muscle, raw.muscle)],
    ["Shape Design", pdfPick_(visit.shapeDesign, raw.shapeDesign)]
  ]);

  var rxRight = pdfCard_([
    ["Brow Guard", pdfPick_(visit.browGuard, raw.browGuard)],
    ["Change Items", pdfPick_(visit.changeItems, raw.changeItems)],
    ["Mix Ratio", pdfPick_(visit.mixRatio, raw.mixRatio)],
    ["Redness", pdfPick_(visit.redness, raw.redness)],
    ["Adherence", pdfPick_(visit.adherence, raw.adherence)]
  ]);

  var custName = (customer && (customer.nickname || customer.fullName)) || "";
  var techName = "ชนิสตา ศุภสุข";
  var agreedLabel = finalAgree ? pdfValue_(finalAgree) : (visit.signatureCustomerUrl ? "Agreed" : "-");

  return [
    "<!doctype html><html><head><meta charset=\"utf-8\">",
    "<style>",
    "*{box-sizing:border-box;}",
    "body{margin:0;padding:0;color:#261F1C;font-family:Arial,'Noto Sans Thai',sans-serif;font-size:11px;line-height:1.45;background:#fff;}",
    ".page{padding:0 0 18px;}",
    ".band{background:#5E4737;color:#fff;padding:18px 28px;}",
    ".band-table{width:100%;border-collapse:collapse;}",
    ".band-table td{vertical-align:middle;padding:0;}",
    ".logo-wrap{width:42%;}",
    ".logo{height:42px;width:auto;display:block;}",
    ".logo-fallback{font-size:28px;font-weight:600;letter-spacing:.02em;}",
    ".logo-fallback .studio{display:block;font-size:14px;font-style:italic;font-weight:400;margin-top:2px;opacity:.92;}",
    ".band-title{text-align:right;}",
    ".band-title .h{font-size:22px;font-weight:700;letter-spacing:.06em;line-height:1.1;}",
    ".band-title .s{font-size:11px;opacity:.92;margin-top:4px;}",
    ".meta{background:#F0ECE4;padding:10px 28px;color:#5E4737;font-size:11px;}",
    ".meta table{width:100%;border-collapse:collapse;}",
    ".meta td{padding:0;}",
    ".meta b{font-weight:700;}",
    ".content{padding:18px 28px 8px;}",
    ".sec-title{margin:16px 0 8px;}",
    ".sec-title .bar{display:inline-block;width:4px;height:14px;background:#5E4737;vertical-align:middle;margin-right:8px;border-radius:1px;}",
    ".sec-title .sec-text{font-size:12px;font-weight:700;color:#5E4737;vertical-align:middle;}",
    ".sec-title .en{font-weight:600;color:#866957;}",
    ".cols{width:100%;border-collapse:separate;border-spacing:12px 0;margin:0 -12px 4px;}",
    ".cols td{width:50%;vertical-align:top;}",
    ".card{background:#F7F4EF;border:1px solid #E6E0D6;border-radius:10px;padding:4px 0;min-height:72px;}",
    ".kv-table{width:100%;border-collapse:collapse;}",
    ".kv td{padding:8px 14px;border-bottom:1px solid #E6E0D6;vertical-align:top;}",
    ".kv.last td{border-bottom:none;}",
    ".k{width:42%;color:#866957;font-weight:500;}",
    ".v{text-align:right;color:#261F1C;font-weight:600;}",
    ".empty{padding:16px;color:#866957;text-align:center;}",
    ".photo-frame{background:#F7F4EF;border:1px solid #E6E0D6;border-radius:12px;height:210px;overflow:hidden;text-align:center;}",
    ".photo{max-width:100%;max-height:180px;}",
    ".photo-empty{padding-top:70px;color:#866957;}",
    ".photo-tag{display:inline-block;margin-top:8px;background:#5E4737;color:#fff;font-size:10px;font-weight:700;letter-spacing:.04em;padding:4px 14px;border-radius:999px;}",
    ".agree-box{background:#F7F4EF;border:1px solid #E6E0D6;border-radius:10px;padding:14px 16px;color:#261F1C;}",
    ".agree-box .en{margin-top:8px;color:#866957;font-size:10px;}",
    ".status-grid{width:100%;border-collapse:collapse;margin-top:10px;border:1px solid #E6E0D6;border-radius:8px;}",
    ".status-grid th,.status-grid td{border:1px solid #E6E0D6;padding:8px 10px;text-align:center;}",
    ".status-grid th{background:#F0ECE4;color:#866957;font-weight:600;font-size:10px;}",
    ".status-grid td{font-weight:600;}",
    ".sig-frame{border:1.5px dashed #C9BFB2;border-radius:10px;height:110px;background:#fff;text-align:center;overflow:hidden;}",
    ".sig-img{max-height:110px;max-width:100%;}",
    ".sig-empty{padding-top:44px;color:#866957;}",
    ".sig-line{border-top:1px solid #C9BFB2;margin:10px 8px 6px;}",
    ".sig-cap{text-align:center;font-weight:600;color:#5E4737;}",
    ".sig-sub{text-align:center;color:#866957;font-size:10px;margin-top:2px;}",
    ".confidential{background:#F0ECE4;color:#866957;font-size:10px;padding:10px 28px;margin-top:18px;}",
    ".footer{padding:8px 28px 0;color:#A3988C;font-size:10px;}",
    ".footer table{width:100%;}",
    ".pagebreak{page-break-before:always;}",
    "</style></head><body>",

    // ===== PAGE 1 =====
    '<div class="page">',
    '<div class="band"><table class="band-table"><tr>',
    '<td class="logo-wrap">',
    logoSrc
      ? '<img class="logo" src="' + logoSrc + '" alt="pyne studio">'
      : '<div class="logo-fallback">pyne<span class="studio">studio</span></div>',
    "</td>",
    '<td class="band-title"><div class="h">CONSENT FORM</div><div class="s">Permanent Makeup &amp; Tattoo Studio</div></td>',
    "</tr></table></div>",

    '<div class="meta"><table><tr>',
    "<td><b>ID:</b> " + pdfEscape_(customerId) + "</td>",
    "<td><b>Service:</b> " + pdfEscape_(visit.serviceId || "-") + "</td>",
    "<td><b>Visit:</b> " + pdfEscape_(pdfDateTime_(visit.visitDate, "d MMM yyyy")) + "</td>",
    "<td><b>Booking:</b> " + pdfEscape_(visit.zervaBookingId || "-") + "</td>",
    "</tr></table></div>",

    '<div class="content">',
    '<table class="cols"><tr>',
    "<td>" + pdfSectionTitle_("ข้อมูลลูกค้า", "PATIENT") + patientCard + "</td>",
    "<td>" + pdfSectionTitle_("ข้อมูลการนัด", "VISIT") + visitCard + "</td>",
    "</tr></table>",

    pdfSectionTitle_("ข้อมูลประกอบ", "CONSULTATION NOTES"),
    '<table class="cols"><tr>',
    "<td>" + consultLeft + "</td>",
    "<td>" + consultRight + "</td>",
    "</tr></table>",

    pdfSectionTitle_("สรุปบริการ", "SERVICE PRESCRIPTION"),
    '<table class="cols"><tr>',
    "<td>" + rxLeft + "</td>",
    "<td>" + rxRight + "</td>",
    "</tr></table>",
    "</div>",

    '<div class="footer"><table><tr>',
    "<td>Generated by Pyne Studio CRM · " + pdfEscape_(exportedAt) + "</td>",
    "<td style=\"text-align:right\">หน้า 1 / 2</td>",
    "</tr></table></div>",
    "</div>",

    // ===== PAGE 2 =====
    '<div class="page pagebreak">',
    '<div class="band"><table class="band-table"><tr>',
    '<td class="logo-wrap">',
    logoSrc
      ? '<img class="logo" src="' + logoSrc + '" alt="pyne studio">'
      : '<div class="logo-fallback">pyne<span class="studio">studio</span></div>',
    "</td>",
    '<td class="band-title"><div class="h">CONSENT FORM</div><div class="s">Permanent Makeup &amp; Tattoo Studio</div></td>',
    "</tr></table></div>",

    '<div class="meta"><table><tr>',
    "<td><b>ID:</b> " + pdfEscape_(customerId) + "</td>",
    "<td><b>Service:</b> " + pdfEscape_(visit.serviceId || "-") + "</td>",
    "<td><b>Visit:</b> " + pdfEscape_(pdfDateTime_(visit.visitDate, "d MMM yyyy")) + "</td>",
    "<td><b>Booking:</b> " + pdfEscape_(visit.zervaBookingId || "-") + "</td>",
    "</tr></table></div>",

    '<div class="content">',
    pdfSectionTitle_("รูปภาพก่อน-หลัง", "BEFORE & AFTER"),
    '<table class="cols"><tr>',
    pdfPhotoCell_(visit.beforePhotoUrl, "BEFORE"),
    pdfPhotoCell_(visit.afterPhotoUrl, "AFTER"),
    "</tr></table>",

    pdfSectionTitle_("ใบยินยอม", "CONSENT AGREEMENT"),
    '<div class="agree-box">' +
      "<div>" + pdfEscape_(PDF_CONSENT_TH_) + "</div>" +
      '<div class="en">' + pdfEscape_(PDF_CONSENT_EN_) + "</div>" +
    "</div>",
    '<table class="status-grid"><tr>',
    "<th>วันเวลาที่ยินยอม</th><th>ผลการยินยอม</th><th>ลายเซ็นลูกค้า</th><th>ลายเซ็นช่าง</th>",
    "</tr><tr>",
    "<td>" + pdfEscape_(pdfDateTime_(agreedAt, "d MMM yyyy · HH:mm")) + "</td>",
    "<td>" + pdfEscape_(agreedLabel) + "</td>",
    "<td>" + (visit.signatureCustomerUrl ? "Signed ✓" : "-") + "</td>",
    "<td>" + (visit.signatureTechUrl ? "Signed ✓" : "-") + "</td>",
    "</tr></table>",

    pdfSectionTitle_("ลายเซ็นรับรอง", "AUTHORIZED SIGNATURES"),
    '<table class="cols"><tr>',
    pdfSigCell_(visit.signatureCustomerUrl, "ลายเซ็นลูกค้า", custName + (agreedAt ? " · " + pdfDateTime_(agreedAt, "d MMM yyyy · HH:mm") : "")),
    pdfSigCell_(visit.signatureTechUrl, "ลายเซ็นช่าง", techName),
    "</tr></table>",
    "</div>",

    '<div class="confidential">เอกสารนี้เป็นความลับและใช้สำหรับบันทึกการให้บริการภายใน Pyne Studio เท่านั้น · This document is confidential and for internal Pyne Studio service records only.</div>',
    '<div class="footer"><table><tr>',
    "<td>Generated by Pyne Studio CRM · " + pdfEscape_(exportedAt) + "</td>",
    "<td style=\"text-align:right\">หน้า 2 / 2</td>",
    "</tr></table></div>",
    "</div>",

    "</body></html>"
  ].join("");
}

function createConsentPdf_(customer, visit) {
  var filename = "consent-" + ((customer && customer.customerId) || visit.serviceId || "export");

  try {
    var exportFolder = getPdfExportFolder_(customer, visit);
    var html = createConsentPdfHtml_(customer, visit);
    var htmlBlob = Utilities.newBlob(html, "text/html", filename + ".html");
    var pdfBlob = htmlBlob.getAs(MimeType.PDF).setName(filename + ".pdf");
    var pdfFile = exportFolder.createFile(pdfBlob);
    // ให้เปิดจากลิงก์ได้ทันที (โฟลเดอร์ _exports ไม่ได้แชร์แบบ visit folder)
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileId: pdfFile.getId(),
      url: "https://drive.google.com/file/d/" + pdfFile.getId() + "/view?usp=sharing",
      downloadUrl: "https://drive.google.com/uc?export=download&id=" + pdfFile.getId(),
      filename: filename + ".pdf",
      note: "สร้าง PDF แล้ว"
    };
  } catch (e) {
    return {
      success: false,
      error: "pdf_export_failed",
      note: "สร้าง PDF ไม่สำเร็จ — " + (e && e.message ? e.message : String(e))
    };
  }
}

function exportConsentPdf(token, serviceId) {
  requireSession_(token);
  if (!serviceId) return { success: false, error: "missing_service_id", note: "ไม่พบ Service ID สำหรับ export PDF" };

  var visit = findPdfVisit_(serviceId);
  if (!visit) return { success: false, error: "visit_not_found", note: "ไม่พบข้อมูล Visit นี้" };

  var customer = findPdfCustomer_(visit.customerId);
  if (!customer) return { success: false, error: "customer_not_found", note: "ไม่พบข้อมูลลูกค้าของ Visit นี้" };

  return createConsentPdf_(customer, visit);
}
