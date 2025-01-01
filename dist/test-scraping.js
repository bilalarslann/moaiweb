"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeNews = scrapeNews;
var chromium = require('chrome-aws-lambda');
var puppeteer = require('puppeteer-core');
function scrapeNews(searchQuery) {
    return __awaiter(this, void 0, void 0, function () {
        var browser, _a, _b, page, newsItems, processedCount, titleElements, titleElement, title, url, newPage, content, err_1, err_2;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 22, 23, 26]);
                    console.log('Launching browser...');
                    _b = (_a = puppeteer).launch;
                    _c = {
                        args: chromium.args,
                        defaultViewport: chromium.defaultViewport
                    };
                    return [4 /*yield*/, chromium.executablePath];
                case 1: return [4 /*yield*/, _b.apply(_a, [(_c.executablePath = _d.sent(),
                            _c.headless = true,
                            _c.ignoreHTTPSErrors = true,
                            _c)])];
                case 2:
                    // Netlify Functions için özel yapılandırma
                    browser = _d.sent();
                    return [4 /*yield*/, browser.newPage()];
                case 3:
                    page = _d.sent();
                    // Bot tespitini engellemeye çalış
                    return [4 /*yield*/, page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')];
                case 4:
                    // Bot tespitini engellemeye çalış
                    _d.sent();
                    // JavaScript değişkenini override et
                    return [4 /*yield*/, page.evaluateOnNewDocument(function () {
                            Object.defineProperty(navigator, 'webdriver', { get: function () { return false; } });
                        })];
                case 5:
                    // JavaScript değişkenini override et
                    _d.sent();
                    console.log('Fetching news for query:', searchQuery);
                    return [4 /*yield*/, page.goto("https://cryptopanic.com/news?search=".concat(encodeURIComponent(searchQuery)), {
                            waitUntil: 'networkidle0',
                            timeout: 15000 // Netlify'da timeout süresini kısalttık
                        })];
                case 6:
                    _d.sent();
                    // Sayfanın yüklenmesi için bekle
                    console.log('Waiting for page to load...');
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                case 7:
                    _d.sent();
                    newsItems = [];
                    processedCount = 0;
                    _d.label = 8;
                case 8:
                    if (!(processedCount < 5)) return [3 /*break*/, 21];
                    // title-text elementlerini bul
                    console.log('Looking for news items...');
                    return [4 /*yield*/, page.$$('.title-text')];
                case 9:
                    titleElements = _d.sent();
                    if (titleElements.length === 0 || processedCount >= titleElements.length) {
                        console.log('No more news items found');
                        return [3 /*break*/, 21];
                    }
                    _d.label = 10;
                case 10:
                    _d.trys.push([10, 19, , 20]);
                    titleElement = titleElements[processedCount];
                    return [4 /*yield*/, page.evaluate(function (el) { return el.textContent; }, titleElement)];
                case 11:
                    title = _d.sent();
                    return [4 /*yield*/, page.evaluate(function (el) { return el.getAttribute('href'); }, titleElement)];
                case 12:
                    url = _d.sent();
                    console.log("Processing news item ".concat(processedCount + 1, ": ").concat(title));
                    return [4 /*yield*/, browser.newPage()];
                case 13:
                    newPage = _d.sent();
                    return [4 /*yield*/, newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')];
                case 14:
                    _d.sent();
                    return [4 /*yield*/, newPage.goto("https://cryptopanic.com".concat(url), {
                            waitUntil: 'networkidle0',
                            timeout: 10000
                        })];
                case 15:
                    _d.sent();
                    // İçeriğin yüklenmesini bekle
                    return [4 /*yield*/, newPage.waitForSelector('.description-body', { timeout: 5000 })];
                case 16:
                    // İçeriğin yüklenmesini bekle
                    _d.sent();
                    return [4 /*yield*/, newPage.$eval('.description-body', function (el) { return el.textContent || ''; })];
                case 17:
                    content = _d.sent();
                    // Sekmeyi kapat
                    return [4 /*yield*/, newPage.close()];
                case 18:
                    // Sekmeyi kapat
                    _d.sent();
                    newsItems.push({
                        title: (title === null || title === void 0 ? void 0 : title.trim()) || '',
                        content: ((content === null || content === void 0 ? void 0 : content.trim()) || '').length > 300 ? content.trim().substring(0, 300) + '...' : content.trim(),
                        url: url ? "https://cryptopanic.com".concat(url) : ''
                    });
                    console.log("Successfully scraped news item ".concat(processedCount + 1));
                    processedCount++;
                    return [3 /*break*/, 20];
                case 19:
                    err_1 = _d.sent();
                    console.error('Error processing news item:', err_1);
                    processedCount++; // Hata olsa bile devam et
                    return [3 /*break*/, 20];
                case 20: return [3 /*break*/, 8];
                case 21:
                    console.log("Successfully scraped ".concat(newsItems.length, " news items"));
                    return [2 /*return*/, newsItems];
                case 22:
                    err_2 = _d.sent();
                    console.error('Error scraping Cryptopanic:', err_2.message);
                    return [2 /*return*/, []];
                case 23:
                    if (!browser) return [3 /*break*/, 25];
                    return [4 /*yield*/, browser.close()];
                case 24:
                    _d.sent();
                    _d.label = 25;
                case 25: return [7 /*endfinally*/];
                case 26: return [2 /*return*/];
            }
        });
    });
}
// Test fonksiyonu
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var searchQuery, news;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    searchQuery = process.argv[2] || 'bitcoin';
                    console.log("Testing scraping for query: ".concat(searchQuery));
                    return [4 /*yield*/, scrapeNews(searchQuery)];
                case 1:
                    news = _a.sent();
                    console.log('\nResults:');
                    news.forEach(function (item, index) {
                        console.log("\n".concat(index + 1, ". ").concat(item.title));
                        console.log("Content: ".concat(item.content));
                        console.log("URL: ".concat(item.url));
                    });
                    return [2 /*return*/];
            }
        });
    });
}
// Eğer doğrudan çalıştırılıyorsa test fonksiyonunu çalıştır
if (require.main === module) {
    main().catch(console.error);
}
