const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const axios = require('axios');
const yts = require("yt-search");
const moment = require("moment-timezone");
const FormData = require('form-data');
const os = require('os');
const nodemailer = require('nodemailer');
const firebaseAdmin = require('firebase-admin');
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const cheerio = require('cheerio');
const qs = require('qs');
const multer = require("multer");
const fs = require("fs");
const https = require('https');
const fetch = require('node-fetch')
const uploadFile = require('./lib/uploadFile.js')
const undici = require('undici')
const { lookup } = require("mime-types");
const { ref, set, get, child, update, remove } = require('firebase/database');
const { getAuth, applyActionCode, confirmPasswordReset, verifyPasswordResetCode } = require("firebase/auth");
const { database, auth } = require('./firebase.js');
const UploadImage = require('./lib/uploader.js');
const Uploader = require("./lib/uploader.js");
const app = express();
// Initial valid API keys
const validApiKeys = ['aluxi', 'alvianuxio', 'admin', 'global', 'world', 'sepuh', 'indonesia'];
const adminPassword = "alds31"; // Password untuk otorisasi
const PORT = process.env.PORT || 3000;
app.enable("trust proxy");
app.set("json spaces", 2);

// Middleware untuk CORS
app.use(cors());


// ytdlnew
async function newyt(url, type) {
    const headers = {
        "accept": "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "Referer": "https://id.ytmp3.mobi/",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    };

    try {
        // Parallel request untuk inisialisasi dan ID video
        const [initial, idMatch] = await Promise.all([
            axios.get(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Math.random()}`, { headers }),
            Promise.resolve(url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?/]+)/))
        ]);

        const init = initial.data;
        if (!init?.convertURL || !idMatch?.[1]) {
            throw new Error("Gagal mendapatkan data inisialisasi atau ID video tidak valid");
        }

        const id = idMatch[1];
        const mp4_ = `${init.convertURL}&v=${id}&f=mp4&_=${Math.random()}`;
        const mp3_ = `${init.convertURL}&v=${id}&f=mp3&_=${Math.random()}`;

        // Parallel request untuk MP4 dan MP3
        const [mp4Res, mp3Res] = await Promise.all([
            axios.get(mp4_, { headers }),
            axios.get(mp3_, { headers })
        ]);

        if (!mp4Res?.data?.downloadURL || !mp3Res?.data?.downloadURL || !mp3Res?.data?.progressURL) {
            throw new Error("Gagal mendapatkan URL unduhan atau progress dari server");
        }

        // Ambil progress hanya 1x untuk mempercepat
        const progress = await axios.get(mp3Res.data.progressURL, { headers, timeout: 3000 }).catch(() => ({}));
        const title = progress?.data?.title || "Tidak diketahui";

        return {
            title,
            downloadURL: type === 'mp4' ? mp4Res.data.downloadURL : mp3Res.data.downloadURL
        };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
}
// black box
async function blackbox(query) {
  const id = crypto.randomBytes(16).toString('hex');
  const data = JSON.stringify({
    "messages": [
      {
        "role": "user",
        "content": query,
        "id": id
      }
    ],
    "agentMode": {},
    "id": id,
    "previewToken": null,
    "userId": null,
    "codeModelMode": true,
    "trendingAgentMode": {},
    "isMicMode": false,
    "userSystemPrompt": null,
    "maxTokens": 1024,
    "playgroundTopP": null,
    "playgroundTemperature": null,
    "isChromeExt": false,
    "githubToken": "",
    "clickedAnswer2": false,
    "clickedAnswer3": false,
    "clickedForceWebSearch": false,
    "visitFromDelta": false,
    "isMemoryEnabled": false,
    "mobileClient": false,
    "userSelectedModel": null,
    "validated": "00f37b34-a166-4efb-bce5-1312d87f2f94",
    "imageGenerationMode": false,
    "webSearchModePrompt": false,
    "deepSearchMode": false,
    "domains": null,
    "vscodeClient": false,
    "codeInterpreterMode": false,
    "customProfile": {
      "name": "",
      "occupation": "",
      "traits": [],
      "additionalInfo": "",
      "enableNewChats": false
    },
    "session": null,
    "isPremium": false
  });
 
  const config = {
    method: 'POST',
    url: 'https://www.blackbox.ai/api/chat',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
      'Content-Type': 'application/json',
      'accept-language': 'id-ID',
      'referer': 'https://www.blackbox.ai/',
      'origin': 'https://www.blackbox.ai',
      'alt-used': 'www.blackbox.ai',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'priority': 'u=0',
      'te': 'trailers'
    },
    data: data
  };
 
  const api = await axios.request(config);
  return api.data;
}
// luminai
async function luminai(content, prompt) {
    return new Promise(async (resolve, reject) => {
        const payload = { content, prompt };

        try {
            const response = await axios.post('https://luminai.my.id/', payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            resolve(response.data.result);
        } catch (error) {
            reject(error.response ? error.response.data : error.message);
        }
    });
}
// quotes
async function quotes() {
    try {
        let {
            data
        } = await axios.get(`https://quotes.toscrape.com/random`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        let $ = cheerio.load(data);
        let quoteText = $('.quote .text')
            .text()
            .trim();
        let author = $('.quote .author')
            .text()
            .trim();
        let tags = [];

        $('.quote .tags .tag')
            .each((i, el) => {
                tags.push($(el)
                    .text()
                    .trim());
            });

        return {
            quote: quoteText,
            author: author,
            tags: tags
        };
    } catch (error) {
        console.error('Error fetching quote:', error.message);
        return null;
    }
}
// sticker ly dl
const dlly = async (urlSticker) => {
    try {
        let { data: a } = await axios.get(urlSticker);
        let $ = cheerio.load(a);

        let stickers = [];
        $('#content_images .sticker_img').each((i, el) => {
            stickers.push($(el).attr('src'));
        });

        return stickers;
    } catch (error) {
        console.error(error);
    }
};
// tiktok photo
async function tiktokPhoto(query, counts) {
    try {
        const payload = {
            keywords: query,
            count: counts,
            cursor: 0,
            web: 1,
            hd: 1
        };

        const URI = 'https://tikwm.com/api/photo/search';
        const {
            data
        } = await axios.post(URI, payload);

        return data.data.videos;
    } catch (error) {
        throw new Error(`Failed to fetch TikTok photos: ${error.message}`);
    }
}
// yahoo search
async function yahoo(text) {
    try {
        const {
            data: html
        } = await axios.get(
            `https://search.yahoo.com/search?p=${text}&fr=yfp-hrmob&fr2=p%3Afp%2Cm%3Asb&.tsrc=yfp-hrmob&ei=UTF-8&fp=1&toggle=1&cop=mss`
        );
        const $ = cheerio.load(html);
        const results = [];

        $('li.s-card')
            .each((i, el) => {
                const title = $(el)
                    .find('.s-card-hl')
                    .text()
                    .trim();
                const url = $(el)
                    .find('a.s-card-wrapAnchor')
                    .attr('href');
                const duration = $(el)
                    .find('.ctimestamp')
                    .text()
                    .trim();
                const uploadDate = $(el)
                    .find('.s-card-date')
                    .text()
                    .trim();
                const views = $(el)
                    .find('.s-card-views')
                    .text()
                    .trim();

                results.push({
                    title,
                    url,
                    duration,
                    uploadDate,
                    views
                });
            });

        return results
    } catch (error) {
        console.error('Error fetching or parsing data:', error);
    }
}
// jadwal tv
async function jdtv(tv) {
    try {
        let {
            data
        } = await axios.get(`https://www.jadwaltv.net/channel/${tv}`);
        let $ = cheerio.load(data);

        let hasil = [];

        $('table.table-bordered tbody tr')
            .each((i, el) => {
                let jam = $(el)
                    .find('td')
                    .eq(0)
                    .text()
                    .trim();
                let acara = $(el)
                    .find('td')
                    .eq(1)
                    .text()
                    .trim();

                if (jam && acara) {
                    hasil.push({
                        jam,
                        acara
                    });
                }
            });

        return hasil;
    } catch (error) {
        console.error('Error:', error.message);
    }
}
// mistral
const mistralNemo = {
   chat: async (question) => {
      let d = new FormData();
      d.append("content", `User: ${question}`);
      d.append("model", "@mistral/open-mistral-nemo");
      
      let head = {
         headers: {
            ...d.getHeaders()
         }
      };
      
      let { data: ak } = await axios.post("https://mind.hydrooo.web.id/v1/chat", d, head);
      
      return ak.result;
   }
};
// deepseek
const deepSeekCoder = {
   chat: async (question) => {
      let d = new FormData();
      d.append("content", `User: ${question}`);
      d.append("model", "@hf/thebloke/deepseek-coder-6.7b-instruct-awq");
      
      let head = {
         headers: {
            ...d.getHeaders()
         }
      };
      
      let { data: ak } = await axios.post("https://mind.hydrooo.web.id/v1/chat", d, head);
      
      return ak.result;
   }
};
// krakenfiles
async function krakenfiles(url) {
    return new Promise(async(resolve, reject) => {
         if (!/krakenfiles.com/.test(url)) return new Error("Input Url from Krakenfiles !")
          let { data } = await axios.get(url, {     
              headers: {
                 "User-Agent": "Posify/1.0.0",
                 "Referer": url,
                 "Accept": "*/*"
               },
           }).catch((e) => e.response);
           let $ = cheerio.load(data);
           let result = {
              metadata: {},
              buffer: null
          }
          result.metadata.filename = $(".coin-info .coin-name h5").text().trim();
          $(".nk-iv-wg4 .nk-iv-wg4-overview li").each((a, i) => {
          let name = $(i).find(".sub-text").text().trim().split(" ").join("_").toLowerCase()
          let value = $(i).find(".lead-text").text()
              result.metadata[name] = value
          })
         $(".nk-iv-wg4-list li").each((a, i) => {
          let name = $(i).find("div").eq(0).text().trim().split(" ").join("_").toLowerCase()
          let value = $(i).find("div").eq(1).text().trim().split(" ").join(",")
              result.metadata[name] = value
         })  
         if ($("video").html()) {
             result.metadata.thumbnail = "https:" + $("video").attr("poster");
             } else if ($(".lightgallery").html()) {
             result.metadata.thumbnail = "https:" + $(".lightgallery a").attr("href");
            } else {
            result.metadata.thumbnail = "N\A"
         }
         let downloads = ""
         if ($("video").html()) {
              downloads = "https:" + $("video source").attr("src")
            } else {
              downloads = "https:" + $(".lightgallery a").attr("href");
          }
         const res = await axios.get(downloads, {     
              headers: {
               "User-Agent": "Posify/1.0.0",
               "Referer": url ,
               "Accept": "*/*",
               "token": $("#dl-token").val()
             },
           responseType: "arraybuffer"
         }).catch((e) => e.response);
           if (!Buffer.isBuffer(res.data)) return new Error("Result is Not a buffer !")
           result.buffer = res.data
           resolve(result)
    })
}
// Dafont
async function sfont(q) {
    const response = await fetch(`https://www.dafont.com/search.php?q=${q}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    const regex = /<div class="lv1left dfbg">.*?<span class="highlight">(.*?)<\/span>.*?by <a href="(.*?)">(.*?)<\/a>.*?<\/div>.*?<div class="lv1right dfbg">.*?<a href="(.*?)">(.*?)<\/a>.*?>(.*?)<\/a>.*?<\/div>.*?<div class="lv2right">.*?<span class="light">(.*?)<\/span>.*?<\/div>.*?<div style="background-image:url\((.*?)\)" class="preview">.*?<a href="(.*?)">/g;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        const [, title, authorLink, author, themeLink, theme, , totalDownloads, previewImage, link] = match;

        results.push({
            title: title.trim() || 'Tidak diketahui',
            authorLink: `https://www.dafont.com/${authorLink.trim()}` || 'Tidak diketahui',
            author: author.trim() || 'Tidak diketahui',
            themeLink: `https://www.dafont.com/${themeLink.trim()}` || 'Tidak diketahui',
            theme: theme.trim() || 'Tidak diketahui',
            totalDownloads: totalDownloads.trim().replace(/[^0-9]/g, '') || 'Tidak diketahui',
            previewImage: `https://www.dafont.com${previewImage.trim()}` || 'Tidak diketahui',
            link: `https://www.dafont.com/${link.trim()}` || 'Tidak diketahui',
        });
    }

    return results;
}
// wikipedia
async function wiki(query) {
    const res = await axios.get(`https://id.m.wikipedia.org/wiki/${query}`)
    const $ = cheerio.load(res.data)
    const hasil = []
    let wiki = $('#mf-section-0').find('p').text()
    let thumb = $('meta[property="og:image"]').attr('content')
    hasil.push({
        wiki, thumb
    })
    return hasil
}
// soundcloud
async function scs(search) {
    return new Promise(async (resolve, reject) => {
        try {
            const {
                data,
                status
            } = await axios.get(`https://soundcloud.com/search?q=${search}`)
            const $ = cheerio.load(data)
            const ajg = []
            $('#app > noscript').each((u, i) => {
                ajg.push($(i).html())
            })
            const _$ = cheerio.load(ajg[1])
            const hasil = []
            _$('ul > li > h2 > a').each((i, u) => {
                if ($(u).attr('href').split('/').length === 3) {
                    const linkk = $(u).attr('href')
                    const judul = $(u).text()
                    const link = linkk ? linkk : 'Tidak ditemukan'
                    const jdi = `https://soundcloud.com${link}`
                    const jadu = judul ? judul : 'Tidak ada judul'
                    hasil.push({
                        link: jdi,
                        judul: jadu
                    })
                }
            })
            if (hasil.every(x => x === undefined)) return {
                developer: '@Fruatre',
                mess: 'no result found'
            }
            resolve(hasil)
        } catch (err) {
            console.error(err)
        }
    })
}
// tt stalk
async function tiktokStalk(username) {
    try {
        const response = await axios.get("https://www.tiktok.com/@" + username + "?_t=ZS-8tHANz7ieoS&_r=1");
        const html = response.data;
        const $ = cheerio.load(html);
        const scriptData = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();

        if (!scriptData) {
            throw new Error('Data tidak ditemukan');
        }

        const parsedData = JSON.parse(scriptData);

        const userDetail = parsedData?.__DEFAULT_SCOPE__?.['webapp.user-detail'];
        if (!userDetail) {
            throw new Error('User tidak ditemukan');
        }

        const userInfo = userDetail.userInfo?.user || {};
        const stats = userDetail.userInfo?.stats || {};

        const metadata = {
            userInfo: {
                id: userInfo.id || null,
                username: userInfo.uniqueId || null,
                nama: userInfo.nickname || null,
                avatar: userInfo.avatarLarger || null,
                bio: userInfo.signature || null,
                verifikasi: userInfo.verified || false,
                statistik: {
                    totalFollowers: stats.followerCount || 0,
                    totalMengikuti: stats.followingCount || 0,
                    totalDisukai: stats.heart || 0,
                    totalVideo: stats.videoCount || 0,
                    totalTeman: stats.friendCount || 0,
                },
            },
        };

        return JSON.stringify(metadata, null, 2);
    } catch (error) {
        return JSON.stringify({ error: error.message }, null, 2);
    }
}

// otakudese

async function otaksearch(search) {
    const url = 'https://otakudesu.cloud/?s=' + encodeURIComponent(search) + '&post_type=anime';
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const results = [];

        $('ul.chivsrc li').each((index, element) => {
            const title = $(element).find('h2 a').text();
            const link = $(element).find('h2 a').attr('href');
            const image = $(element).find('img').attr('src');
            const genres = [];

            $(element).find('.set a').each((i, el) => {
                genres.push($(el).text());
            });

            const status = $(element).find('.set:contains("Status")').text().replace('Status : ', '').trim();
            const rating = $(element).find('.set:contains("Rating")').text().replace('Rating : ', '').trim();

            results.push({ title, link, image, genres, status, rating });
        });

        return results;
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

async function otakepisode(link) {
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        const downanime = [];

        $('.episodelist ul li span a').each((index, element) => {
            downanime.push($(element).attr('href'));
        });

        return downanime;
    } catch (error) {
        console.error('Error fetching episode links:', error);
        return [];
    }
}

async function otakdetail(link) {
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        const hasil = [];

        const thumbnail = $('img.attachment-post-thumbnail').attr('src');
        const judul = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Judul')).parent().text().trim().split(': ')[1];
        const skor = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Skor')).parent().text().trim().split(': ')[1];
        const produser = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Produser')).parent().text().trim().split(': ')[1];
        const tipe = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Tipe')).parent().text().trim().split(': ')[1];
        const status = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Status')).parent().text().trim().split(': ')[1];
        const studio = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Studio')).parent().text().trim().split(': ')[1];
        const rilis = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Tanggal Rilis')).parent().text().trim().split(': ')[1];
        const episode = $('div.infozingle span b').filter((index, element) => $(element).text().includes('Total Episode')).parent().text().trim().split(': ')[1];

        let sinopsis = '';
        $('.sinopc p').each((index, element) => {
            sinopsis += $(element).text().trim() + '\n';
        });

        const genreArray = [];
        $('div.infozingle span b').filter((index, element) => $(element).text().includes('Genre')).siblings('a').each((index, element) => {
            genreArray.push($(element).text().trim());
        });
        const genre = genreArray.join(', ');
        const downanime = await LinkEpisode(link);

        hasil.push({
            judul,
            skor,
            produser,
            tipe,
            status,
            studio,
            rilis,
            episode,
            genre,
            thumbnail,
            downanime,
            sinopsis: sinopsis.trim()
        });

        return hasil;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function otakupdate() {
    const url = 'https://otakudesu.cloud/ongoing-anime/';
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const updates = [];

        $('ul > li .detpost').each((index, element) => {
            const episode = $(element).find('.epz').text().trim();
            const day = $(element).find('.epztipe').text().trim();
            const date = $(element).find('.newnime').text().trim();
            const link = $(element).find('.thumb a').attr('href');
            const title = $(element).find('.thumbz h2.jdlflm').text().trim();

            updates.push({ title, episode, day, date, link });
        });

        return updates;
    } catch (error) {
        console.error("Error fetching updates:", error);
        return [];
    }
}

async function otakdl(link) {
    try {
        const response = await axios.get(link);
        const $ = cheerio.load(response.data);
        let links = [];

        $('li').each((_, element) => {
            const resolution = $(element).find('strong').text().trim();
            const size = $(element).find('i').text().trim();
            const links = $(element).find('a');

            links.each((_, link) => {
                const server = $(link).text().trim();
                const url = $(link).attr('href');
                if (resolution && url) {
                    links.push({
                        resolution,
                        server,
                        url,
                        size: size || "N/A"
                    });
                }
            });
        });

        return links;
    } catch (error) {
        console.error('Error fetching episode links:', error);
        return [];
    }
}

// pin 2
async function pin2(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    })
    const $ = cheerio.load(response.data)

    const title = $('meta[property="og:title"]').attr('content') || '-'
    const description = $('meta[name="description"]').attr('content') || '-'
    const uploaded = $('meta[property="og:updated_time"]').attr('content') || '-'

    const height = $('meta[property="og:image:height"]').attr('content') || '-'
    const width = $('meta[property="og:image:width"]').attr('content') || '-'
    const fullsource = $('meta[property="og:see_also"]').attr('content') || '-'
    const source = fullsource ? new URL(fullsource).hostname : '-' 

    const { data } = await axios.get(url)
    const img = []
    const $$ = cheerio.load(data)
    $$('img').each((i, el) => {
      img.push($$(el).attr('src'))
    })

    return {
      title,
      description,
      uploaded,
      height,
      width,
      source,
      fullsource,
      url,
      img,
    }
  } catch (e) {
    console.error(e)
    return []
  }
}
// mf 2
async function mf2(url) {
    return new Promise(async (resolve, reject) => {
        try {
            // Prepare the API request URL
            const apiUrl = `https://api.alvianuxio.my.id/api/mediafire/old?url=${encodeURIComponent(url)}&apikey=aluxi`;
            const response = await require("undici").fetch(apiUrl);
            const data = await response.json(); // Parse the response as JSON

            if (data.data && data.data.response) {
                let info = data.data.response;

                // Extract file extension from the link
                const extension = info.link.split('.').pop().split(/\#|\?/)[0]; // Get file extension
                let mimeType;

                // Map the extension to its MIME type
                switch (extension) {
    // Audio
    case 'mp3':
        mimeType = 'audio/mpeg';
        break;
    case 'wav':
        mimeType = 'audio/wav';
        break;
    case 'ogg':
        mimeType = 'audio/ogg';
        break;
    case 'flac':
        mimeType = 'audio/flac';
        break;
    
    // Video
    case 'mp4':
        mimeType = 'video/mp4';
        break;
    case 'mkv':
        mimeType = 'video/x-matroska';
        break;
    case 'webm':
        mimeType = 'video/webm';
        break;
    case 'avi':
        mimeType = 'video/x-msvideo';
        break;
    case 'mov':
        mimeType = 'video/quicktime';
        break;

    // Images
    case 'jpg':
    case 'jpeg':
        mimeType = 'image/jpeg';
        break;
    case 'png':
        mimeType = 'image/png';
        break;
    case 'gif':
        mimeType = 'image/gif';
        break;
    case 'bmp':
        mimeType = 'image/bmp';
        break;
    case 'webp':
        mimeType = 'image/webp';
        break;
    case 'svg':
        mimeType = 'image/svg+xml';
        break;
    
    // Documents
    case 'pdf':
        mimeType = 'application/pdf';
        break;
    case 'doc':
    case 'docx':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    case 'xls':
    case 'xlsx':
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
    case 'ppt':
    case 'pptx':
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
    case 'txt':
        mimeType = 'text/plain';
        break;
    case 'csv':
        mimeType = 'text/csv';
        break;

    // Archives
    case 'zip':
        mimeType = 'application/zip';
        break;
    case 'rar':
        mimeType = 'application/vnd.rar';
        break;
    case '7z':
        mimeType = 'application/x-7z-compressed';
        break;
    case 'tar':
        mimeType = 'application/x-tar';
        break;
    case 'gz':
        mimeType = 'application/gzip';
        break;

    // Code files
    case 'html':
    case 'htm':
        mimeType = 'text/html';
        break;
    case 'css':
        mimeType = 'text/css';
        break;
    case 'js':
        mimeType = 'application/javascript';
        break;
    case 'json':
        mimeType = 'application/json';
        break;
    case 'xml':
        mimeType = 'application/xml';
        break;

    // Default fallback
    default:
        mimeType = 'application/octet-stream'; // Fallback type
        break;
}

                // Prepare the result object
                const hasil = {
                    status: "success",
                    name: info.filename,
                    mimeType: mimeType, // Computed MIME type
                    extension: extension, // Extracted file extension
                    size: info.detail.match(/Filesize:(\S+)/)[1], // Extract the file size
                    uploaded: info.detail.match(/Uploaded:(\S+)/)[1], // Extract the uploaded date
                    link: info.link
                };

                // Log both MIME type and extension
                console.log('MIME Type:', hasil.mimeType);
                console.log('Extension:', hasil.extension);

                resolve(hasil);
            } else {
                reject(new Error('Invalid response structure'));
            }
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}

// track ip
let ipinfoToken = '882ffefc502ce1';
async function getIPInfo(ip) {
    const response = await axios.get(`http://ipinfo.io/${ip}/json?token=${ipinfoToken}`);
    return response.data;
}
// terabox v2
async function teradlx(url) {
    try {
        const getdm = await axios.get(`https://ins.neastooid.xyz/api/Tools/getins?url=https://www.terabox.app/wap/share/filelist?surl=${encodeURIComponent(url)}`);
        
        if (!getdm.data || !getdm.data.jsToken || !getdm.data.bdstoken) {
            throw new Error('Token tidak ditemukan');
        }

        const { jsToken, bdstoken } = getdm.data;

        const getrsd = await axios.get(`https://ins.neastooid.xyz/api/downloader/Metaterdltes?url=${encodeURIComponent(url)}`);
        
        if (!getrsd.data || !getrsd.data.metadata) {
            throw new Error('Metadata tidak ditemukan');
        }

        const { shareId, userKey, sign, timestamp, files } = getrsd.data.metadata;

        const traboxdlxins = await axios.post('https://ins.neastooid.xyz/api/downloader/terade', {
            shareId,
            userKey,
            sign,
            timestamp,
            jsToken,
            bdstoken,
            files
        });

        const response = traboxdlxins.data;

        if (!response || !response.filename || !response.download) {
            throw new Error('Data file tidak valid');
        }

        // Memformat hasil
        const formattedFile = {
            name: response.filename,
            type: response.filename.split('.').pop(),
            size: response.size !== '-1 bytes' ? response.size : 'Unknown', // Jika ukuran tidak ditemukan
            link: response.download
        };

        return formattedFile;
    } catch (error) {
        console.error('Terjadi kesalahan:', error.message);
        throw error;
    }
}
// txt2img v2
async function txt2imgv2(prompt) {
const requestData = JSON.stringify({ "prompt": prompt })
const requestConfig = {
method: 'POST',
url: 'https://imgsys.org/api/initiate',
headers: {
'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
'Content-Type': 'application/json',
'accept-language': 'id-ID',
'referer': 'https://imgsys.org/',
'origin': 'https://imgsys.org',
'sec-fetch-dest': 'empty',
'sec-fetch-mode': 'cors',
'sec-fetch-site': 'same-origin',
'priority': 'u=0',
'te': 'trailers'
},
data: requestData
}
try {
const initiateResponse = await axios.request(requestConfig)
const { requestId } = initiateResponse.data
let imageResponse
do {
imageResponse = await axios.get(`https://imgsys.org/api/get?requestId=${requestId}`)
if (imageResponse.data.message) {
await new Promise(resolve => setTimeout(resolve, 1000))
}
} while (imageResponse.data.message)
return imageResponse.data
} catch (e) {
console.error('Error:', e)
throw e
}}
// tinyurl
async function tiny(url) {
  let res = await fetch(`https://tinyurl.com/api-create.php?url=${url}`);
  return await res.text();
}
// yt-search
async function youtubes(query) {
    try {
        const searchResult = await yts(query);
        const videoResults = searchResult.videos || [];
        return videoResults.map(video => ({
            title: video.title,
            url: video.url,
            ago: video.ago,
            views: video.views,
            timestamp: video.timestamp,
        }));
    } catch (error) {
        console.error('Error in yts function:', error);
        return [];
    }
}
//total rquest
async function trackTotalRequest() {
  const requestRef = ref(database, "requests/count"); // Lokasi di database
  try {
    const snapshot = await get(requestRef);

    if (snapshot.exists()) {
      const currentCount = snapshot.val();
      await set(requestRef, currentCount + 1); // Tambahkan 1 jika data sudah ada
    } else {
      // Jika belum ada data, buat data baru dengan nilai 1
      await set(requestRef, 1);
      console.log("Database 'requests/count' berhasil dibuat dengan nilai awal 1.");
    }
  } catch (error) {
    console.error("Error updating total requests:", error);
  }
}
// play
const formatAudio = ['mp3', 'm4a', 'webm', 'aac', 'flac', 'opus', 'ogg', 'wav'];
const formatVideo = ['360', '480', '720', '1080', '1440', '4k'];

const ddownr = {
  download: async (url, format) => {
    if (!formatAudio.includes(format) && !formatVideo.includes(format)) {
      throw new Error('Format tidak didukung, cek daftar format yang tersedia.');
    }

    const config = {
      method: 'GET',
      url: `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    try {
      const response = await axios.request(config);

      if (response.data && response.data.success) {
        const { id, title, info } = response.data;
        const { image } = info;
        const downloadUrl = await ddownr.cekProgress(id);

        return {
          id: id,
          image: image,
          title: title,
          downloadUrl: downloadUrl
        };
      } else {
        throw new Error('Gagal mengambil detail video.');
      }
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  },
  cekProgress: async (id) => {
    const config = {
      method: 'GET',
      url: `https://p.oceansaver.in/ajax/progress.php?id=${id}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    try {
      while (true) {
        const response = await axios.request(config);

        if (response.data && response.data.success && response.data.progress === 1000) {
          return response.data.download_url;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
};

async function play(query, format) {
  try {
    // Fetch results with a limit on the number of videos
    const results = await yts(query);
    if (results && results.videos && results.videos.length > 0) {
      const video = results.videos[0]; // Get the first video result

      // Gather additional information from the video
      const downloadPromise = newyt(video.url, format); // Start download in parallel

      // Prepare video information without waiting for download to finish
      const videoInfo = {
        title: video.title,
        duration: video.timestamp, // Duration in hh:mm:ss format
        uploadDate: video.ago, // Upload date string
        views: video.views, // Number of views
        channel: video.author, // Channel name
        videoUrl: video.url // Video URL
      };

      // Wait for the download data to complete
      const downloadData = await downloadPromise;

      // Upload hasil unduhan ke Catbox
      const catboxUrl = await Uploader.catbox(downloadData.downloadURL);

      // Add Catbox URL to videoInfo
      videoInfo.image = downloadData.image;
      videoInfo.downloadUrl = catboxUrl;

      return videoInfo;
    } else {
      throw new Error('No videos found for the given query.');
    }
  } catch (error) {
    console.error('Error in play function:', error);
    throw error; // Rethrow the error for handling outside
  }
}
// flux
const freeflux = {
  models: ["flux_1_schnell", "flux_1_dev", "sana_1_6b"],
  sizes: ["1_1", "1_1_HD", "1_2", "2_1", "2_3", "4_5", "9_16", "3_2", "4_3", "16_9"],
  styles: ["no_style", "anime", "digital", "fantasy", "neon_punk", "dark", "low_poly", "line_art", "pixel_art", "comic", "analog_film", "surreal"],
  colors: ["no_color", "cool", "muted", "vibrant", "pastel", "bw"],
  lightings: ["no_lighting", "lighting", "dramatic", "volumetric", "studio", "sunlight", "low_light", "golden_hour"],
 
  create: async function(prompt, model = 1, size = 1, style = 1, color = 1, lighting = 1) {
    const errors = [];
    if (!prompt?.trim()) errors.push("Prompt nya kagak boleh kosong woyyyy 🫵");
    if (!this.models[model - 1]) errors.push(`Index model nya kagak valid, harus pilih dari nomor 1 sampe ${this.models.length}`);
    if (!this.sizes[size - 1]) errors.push(`Index size nya kagak valid, harus pilih dari nomor 1 sampe ${this.sizes.length}`);
    if (!this.styles[style - 1]) errors.push(`Index style nya kagak valid, harus pilih dari nomor 1 sampe ${this.styles.length}`);
    if (!this.colors[color - 1]) errors.push(`Index color nya kagak valid, harus pilih dari nomor 1 sampe ${this.colors.length}`);
    if (!this.lightings[lighting - 1]) errors.push(`Index lighthing nya kagak valid, harus pilih dari nomor 1 sampe ${this.lightings.length}`);
 
    if (errors.length > 0) {
      return { errors };
    }
 
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('model', this.models[model - 1]);
      formData.append('size', this.sizes[size - 1]);
      formData.append('style', this.styles[style - 1]);
      formData.append('color', this.colors[color - 1]);
      formData.append('lighting', this.lightings[lighting - 1]);
 
      const response = await axios.post('https://api.freeflux.ai/v1/images/generate', formData, {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'multipart/form-data',
          'origin': 'https://freeflux.ai',
          'priority': 'u=1, i',
          'referer': 'https://freeflux.ai/',
          'user-agent': 'Postify/1.0.0'
        }
      });
 
      const { id, status, result, processingTime, width, height, nsfw, seed } = response.data;
  const base64Data = result.split(',')[1];

 let up = await Uploader.catbox(Buffer.from(base64Data, 'base64'))
      return {
        data: { id, status, up, processingTime, width, height, nsfw, seed }
      };
 
    } catch (error) {
      console.error(error);
      return { 
        errors: error.message
      };
    }
  }
};
// uhd wallpaper
async function uphd(searchTerm) {
    try {
        const response = await axios.get(`https://www.uhdpaper.com/search?q=${searchTerm}&by-date=true`);
        const html = response.data;
        const $ = cheerio.load(html);
        const results = [];
 
 
        $('article.post-outer-container').each((index, element) => {
            const title = $(element).find('.snippet-title h2').text().trim();
            const imageUrl = $(element).find('.snippet-title img').attr('src');
            const resolution = $(element).find('.wp_box b').text().trim();
            const link = $(element).find('a').attr('href');
 
            results.push({ title, imageUrl, resolution, link });
        });
 
        return results;
    } catch (error) {
        console.error('Error server UHDPaper:', error);
        return [];
    }
}
// bukalapak
async function bukaSearch(nameProduk) {
  try {
    const { data: html } = await axios.get(
      `https://m.bukalapak.com/products?source=navbar&from=omnisearch&search%5Bkeywords%5D=${nameProduk}`
    );
    const $ = cheerio.load(html);
    const products = [];

    $('.dp-card-container').each((index, element) => {
      const name = $(element).find('.dp-card__name-tag').text().trim();
      const price = $(element).find('.bl-text--body-16.bl-text--bold').text().trim();
      const discountPrice = $(element).find('.discount-price').text().trim() || "No Discount";
      const rating = $(element).find('.bl-text--caption-10').first().text().trim();
      const sold = $(element).find('.bl-text--caption-10').last().text().trim();
      const imageUrl = $(element).find('.dp-card__img').attr('src');
      const productLink = $(element).find('a.dp-card__head').attr('href');

      products.push({
        name,
        price,
        discountPrice,
        rating,
        sold,
        imageUrl,
        productLink: `https://m.bukalapak.com${productLink}`,
      });
    });

    return products;
  } catch (error) {
    console.error('Error in bukaSearch:', error);
    return [];
  }
}
// check ip
async function checkip() {
    try {
        // Fetch the public IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const ip = ipData.ip; // Get the IP address

        console.log('Public IP:', ip); // Log the public IP address

        // Now fetch information about the IP address
        const ipInfoResponse = await fetch(`http://ipwho.is/${ip}`);
        const ipInfoData = await ipInfoResponse.json();

        // Only return the IP information without the IP itself
        return ipInfoData; // Return only the IP information
    } catch (error) {
        console.error('Error fetching IP:', error);
        throw error; // Rethrow the error if needed
    }
}
//ssweb
// Fungsi untuk memilih kunci API secara acak
function pickRandom(keys) {
    return keys[Math.floor(Math.random() * keys.length)];
}
async function ssweb(url) {
    const keys = ["f4fd50", "f57572", "f45b80", "a8a45d", "0060ec", "b085e3"];
    const key = pickRandom(keys);

    const apiUrl = `https://api.screenshotmachine.com/?key=${key}&url=${encodeURIComponent(url)}&device=desktop&dimension=1280x720&format=png&cacheLimit=0&delay=200`;

    try {
        // Ambil screenshot sebagai stream
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

        if (response.status === 200) {
            // Kirim hasil screenshot ke uploader
            const uploadedUrl = await UploadImage.catbox(response.data);
            return uploadedUrl; // URL hasil unggahan
        } else {
            throw new Error(`Screenshot API Error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}
// sandbox chat
const chatbot = async (question, model) => {
    const validModels = ["openai", "llama", "mistral", "mistral-large"];
    if (!validModels.includes(model)) {
        return {
            error: `Invalid model selected. Please choose one of: ${validModels.join(', ')}`
        };
    }

    const data = JSON.stringify({
        "messages": [question],
        "character": model
    });    

    const config = {
        method: 'POST',
        url: 'https://chatsandbox.com/api/chat',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
            'Content-Type': 'application/json',
            'accept-language': 'id-ID',
            'referer': `https://chatsandbox.com/chat/${model}`,
            'origin': 'https://chatsandbox.com',
            'alt-used': 'chatsandbox.com',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'priority': 'u=0',
            'te': 'trailers',
            'Cookie': '_ga_V22YK5WBFD=GS1.1.1734654982.3.0.1734654982.0.0.0; _ga=GA1.1.803874982.1734528677'
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        return response.data;    
    } catch (error) {
        return { error: error.message };
    }  
};
//gemini
async function gemini(query) {
    const apiUrl = `https://restapi.apibotwa.biz.id/api/bard?message=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
            }
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        const responseJson = await response.json();
        if (responseJson && responseJson.result) {
            return responseJson.result;
        } else {
            return "Tidak ada pesan dalam response.";
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error.message);
        return "Gagal mendapatkan respons dari server.";
    }
}
//bingsearch
async function bingsearch(query) {
  try {
    const response = await axios.get(`https://www.bing.com/search?q=${query}`);
    const html = response.data;
    const $ = cheerio.load(html);
    const results = [];

    $('.b_algo').each((index, element) => {
      const title = $(element).find('h2').text();
      const link = $(element).find('a').attr('href');
      const snippet = $(element).find('.b_caption p').text();
      const image = $(element).find('.cico .rms_iac').attr('data-src');

      results.push({
        title,
        link,
        snippet,
        image: image ? `https:${image}` : undefined,
      });
    });

    return results;
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

// bing img & video
async function bingimg(query) {
const response = await axios.get(`https://www.bing.com/images/search?q=${query}`);
const html = response.data;
const $ = cheerio.load(html);
const urls = [];
$(".imgpt > a").each((i, el) => {
urls[i] = $(el).attr("href");
});
const results = urls.map(url => ({
photo: `https://www.bing.com${url}`
}));
return results;
}

async function bingvid(query) {
const { data } = await axios.get(`https://www.bing.com/videos/search?q=${query}`);
const $ = cheerio.load(data);
const videoDetails = [];
$('.mc_vtvc').each((index, element) => {
const title = $(element).find('.mc_vtvc_title strong').text();
const duration = $(element).find('.mc_bc_rc.items').first().text();
const views = $(element).find('.meta_vc_content').first().text();
const uploadDate = $(element).find('.meta_pd_content').first().text();
const channel = $(element).find('.mc_vtvc_meta_row_channel').text();
const link = $(element).find('a').attr('href');
videoDetails.push({
title,
duration,
views,
uploadDate,
channel,
link: `https://www.bing.com${link}`
});
});
return videoDetails;
}
//openai
async function openai(query) {
    const apiUrl = `https://restapi.apibotwa.biz.id/api/openai?message=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
            }
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        const responseJson = await response.json();
        if (responseJson && responseJson.result) {
            return responseJson.result;
        } else {
            return "Tidak ada pesan dalam response.";
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error.message);
        return "Gagal mendapatkan respons dari server.";
    }
}
//bingsearch
async function bingsearch(query) {
  try {
    const response = await axios.get(`https://www.bing.com/search?q=${query}`);
    const html = response.data;
    const $ = cheerio.load(html);
    const results = [];

    $('.b_algo').each((index, element) => {
      const title = $(element).find('h2').text();
      const link = $(element).find('a').attr('href');
      const snippet = $(element).find('.b_caption p').text();
      const image = $(element).find('.cico .rms_iac').attr('data-src');

      results.push({
        title,
        link,
        snippet,
        image: image ? `https:${image}` : undefined,
      });
    });

    return results;
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}
//removebg
async function removebg(imageUrl) {
const response = await fetch('https://pxpic.com/callRemoveBackground', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl })
})
const result = await response.json();
return result.resultImageUrl 
}
//hdr
async function hdimg(imageUrl) {
const response = await fetch('https://pxpic.com/callPhotoEnhancer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl })
})
const result = await response.json();
return result.resultImageUrl 
}
//remini
async function remini(imageUrl) {
  try {
    // Validate the file extension

    // Step 1: Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch the image");
    }
    const imageBuffer = await imageResponse.buffer();

    // Step 2: Upscale the image
    const upscaleResponse = await fetch("https://lexica.qewertyy.dev/upscale", {
      body: JSON.stringify({
        image_data: Buffer.from(imageBuffer).toString("base64"),
        format: "binary",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!upscaleResponse.ok) {
      throw new Error("Failed to upscale the image");
    }

    const generatedBuffer = Buffer.from(await upscaleResponse.arrayBuffer());

    // Step 3: Upload the result using uploadFile function
    const downloadLink = await UploadImage.catbox(generatedBuffer);
    console.log("Download Link:", downloadLink);
    return downloadLink;
  } catch (error) {
    console.error("Error processing and uploading image:", error);
    throw error;
  }
}
//txt2img
const txt2img = async (prompt) => {
    const data = JSON.stringify({
        "messages": [prompt],
        "character": "ai-image-generator"
    });

    const config = {
        method: 'POST',
        url: 'https://chatsandbox.com/api/chat',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
            'Content-Type': 'application/json',
            'accept-language': 'id-ID',
            'referer': 'https://chatsandbox.com/ai-image-generator',
            'origin': 'https://chatsandbox.com',
            'alt-used': 'chatsandbox.com',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'priority': 'u=0',
            'te': 'trailers',
            'Cookie': '_ga_V22YK5WBFD=GS1.1.1734654982.3.0.1734654982.0.0.0; _ga=GA1.1.803874982.1734528677'
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        const htmlString = response.data;

        // Mengambil URL dari HTML string
        const urlMatch = htmlString.match(/src="([^"]+)"/);
        if (urlMatch) {
            return urlMatch[1]; // Mengembalikan URL gambar
        } else {
            return { error: "Could not extract image URL from response." };
        }
    } catch (error) {
        return { error: error.message };
    }
};

// igstalk
async function igstalk(username) {
  try {
    const data = qs.stringify({
        'instagram_url': username,
        'type': 'instaviewer',
        'resource': 'save'
    });
 
    const config = {
        method: 'POST',
        url: 'https://www.save-free.com/process',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 8.1.0; CPH1803; Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.4280.141 Mobile Safari/537.36 KiToBrowser/124.0',
            'Accept': 'text/html, */*; q=0.01',
            'accept-language': 'id-ID',
            'referer': 'https://www.save-free.com/instagram-viewer/',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-valy-cache': 'true',
            'x-requested-with': 'XMLHttpRequest',
            'origin': 'https://www.save-free.com',
            'alt-used': 'www.save-free.com',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'priority': 'u=0',
            'te': 'trailers',
            'Cookie': '_ga_9M9G1NYVWE=GS1.1.1734434923.1.1.1734435005.59.0.0; _ga=GA1.1.926126394.1734434923; HstCfa4752989=1734434923234; HstCla4752989=1734435005944; HstCmu4752989=1734434923234; HstPn4752989=2; HstPt4752989=2; HstCnv4752989=1; HstCns4752989=1; c_ref_4752989=https%3A%2F%2Fwww.google.com%2F; _ga_TCKL78VSRE=GS1.1.1734434923.1.1.1734435006.59.0.0; _gcl_au=1.1.154039605.1734434924; cf_clearance=y50rE5aG3y4mNPv97jjPiTVmsTGIjG4NUAU8cfpAZpE-1734435006-1.2.1.1-msruD64x2XJcJ0ayBzlv3tPD.GOk8Hq78wuzqvgva3XK5EA5fhRZSbleDlLd12lA95OMBHoaKS.zVPL4ny7WJhea5by6f83KryCc7mmAlVWi_rCuAogbWeQRclA7iZhIDjMemyXaWskAgcCKK79etIxwenAX_z0L0j7BZ5156EHoHLdgEJFAtayJwFeMtDzV7dEjrhoCz0H3sV3tgq7Cgg.yf3pn1y8eqdIdJM.ogHqlDUPQ189UHyQ74mbzBawhxMHea62eecP7WgmKSiUHdwfOsXGuP1mjEffzgzrQocs.Ubc4QrEnV_KM_5ParR1vt9KyRY0TlZ1g7rGh4TBsU9y_MqBnSpZOd8.KaTihKE_qZMJCa8Pi_IPGHOIC0c3rZMd7.J4WRwH5J8oWjFaE5gvN3kphRxRVDaKgTAOltve_XvOKv75YCMoAmuQVAvUZBhFST2qGoQFyt1vjFiWmKw'
        },
        data: data
    };
 
    const req = await axios.request(config);
    return JSON.stringify(req.data, null, 2);
  } catch (error) {
    return error;
  }
}

// ytdl 
async function ytdl(link, qualityIndex, typeIndex) {
    const qualities = {
        audio: { 1: '32', 2: '64', 3: '128', 4: '192' },
        video: { 1: '144', 2: '240', 3: '360', 4: '480', 5: '720', 6: '1080', 7: '1440', 8: '2160' }
    };

    const headers = {
        accept: '*/*',
        referer: 'https://yt.savetube.me/',
        origin: 'https://yt.savetube.me/',
        'user-agent': 'Postify/1.0.0',
        'Content-Type': 'application/json'
    };

    const getCdnNumber = () => Math.floor(Math.random() * 11) + 51;
    const type = typeIndex === 1 ? 'audio' : 'video';
    const quality = qualities[type][qualityIndex];
    const cdnNumber = getCdnNumber();
    const cdnUrl = `cdn${cdnNumber}.savetube.su`;

    try {
        const videoInfoResponse = await axios.post(
            `https://${cdnUrl}/info`,
            { url: link },
            { headers: { ...headers, authority: `cdn${cdnNumber}.savetube.su` } }
        );

        const videoInfo = videoInfoResponse.data.data;
        if (!videoInfo) {
            throw new Error('Video information could not be retrieved.');
        }

        const body = {
            downloadType: type,
            quality,
            key: videoInfo.key
        };

        const downloadResponse = await axios.post(
            `https://${cdnUrl}/download`,
            body,
            { headers: { ...headers, authority: `cdn${cdnNumber}.savetube.su` } }
        );

        const downloadData = downloadResponse.data.data;
        if (!downloadData || !downloadData.downloadUrl) {
            throw new Error('Download URL could not be retrieved.');
        }

        return {
            title: videoInfo.title,
            titleSlug: videoInfo.titleSlug,
            videoUrl: videoInfo.url,
            duration: videoInfo.duration,            
            id: videoInfo.id,
            thumbnail: videoInfo.thumbnail,
            quality,
            type,
            link: downloadData.downloadUrl                  
        };
    } catch (error) {
        console.error('Error:', error.message);
        return { error: error.message };
    }
}
async function ytmp3(url) {
    const ytd = url;
    const qualityIndex = 1; // Pilih kualitas audio atau video sesuai indeks
    const typeIndex = 1; // 1 untuk audio, 2 untuk video

    try {
        const response = await ytdl(ytd, qualityIndex, typeIndex);
        return response;
    } catch (error) {
        console.error('Error downloading video:', error);
    }
}
async function ytmp4(url) {
    const ytd = url;
    const qualityIndex = 1; // Pilih kualitas audio atau video sesuai indeks
    const typeIndex = 2; // 1 untuk audio, 2 untuk video

    try {
        const response = await ytdl(ytd, qualityIndex, typeIndex);
        return response;
    } catch (error) {
        console.error('Error downloading video:', error);
    }
}
// youtube
async function yt(query) {
  const form = new FormData();
  form.append('query', query);

  try {
    const response = await axios.post('https://yttomp4.pro/', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    const $ = cheerio.load(response.data);

    const results = {
      success: true,
      title: $('.vtitle').text().trim(),
      duration: $('.res_left p').text().replace('Duration: ', '').trim(),
      image: $('.ac img').attr('src'),
      video: null,
      audio: null,
      other: null
    };

    $('.tab-item-data').each((index, tab) => {
      const tabTitle = $(tab).attr('id');
      let lowestQuality = null;

      $(tab).find('tbody tr').each((i, element) => {
        const fileType = $(element).find('td').eq(0).text().trim();
        const fileSize = $(element).find('td').eq(1).text().trim();
        const downloadLink = $(element).find('a.dbtn').attr('href');

        // Parse the file size into a numeric value for comparison (e.g., "1 MB" to 1)
        const numericSize = parseFloat(fileSize.replace(/[^\d.]/g, '')) || Infinity;

        if (!lowestQuality || numericSize < lowestQuality.size) {
          lowestQuality = { fileType, fileSize, downloadLink, size: numericSize };
        }
      });

      // Assign the lowest quality result to the appropriate category
      if (tabTitle === 'tab-item-1' && lowestQuality) {
        results.video = lowestQuality;
      } else if (tabTitle === 'tab-item-2' && lowestQuality) {
        results.audio = lowestQuality;
      } else if (tabTitle === 'tab-item-3' && lowestQuality) {
        results.other = lowestQuality;
      }
    });

    return results;
  } catch (error) {
    console.log('Error:' + error);
    return { success: false, message: error.message };
  }
}
// mediafire 
async function mf(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await require("undici").fetch(url);
            const data = await response.text();
            const $ = cheerio.load(data);
            
            let name = $('.dl-info > div > div.filename').text();
            let link = $('#downloadButton').attr('href');
          let det = $('ul.details').html().replace(/\s/g, "").replace(/<\/li><li>/g, '\n').replace(/<\/?li>|<\/?span>/g, '');
            let type = $('.dl-info > div > div.filetype').text();

        

            const hasil = {
                filename: name,
                filetype: type,
                link: link,
                detail: det
            };

            resolve(hasil);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}

// tiktok 3
async function tiktok3(query) {
  return new Promise(async (resolve, reject) => {
    try {
      // Encode the query URL and append your API key
      const url = encodeURIComponent(query);
      const apiKey = 'aluxi';  // The API key to use

      const response = await axios({
        method: "GET",  // Use GET since the parameters are passed in the URL
        url: `https://api.alvianuxio.my.id/api/tiktok3?url=${url}&apikey=${apiKey}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
        },
      });

      const videoData = response.data.data.response.data;  // Access the video data

      const result = {
        Id: videoData.id,
        title: videoData.title,
        size: videoData.size,
        wmsize: videoData.wm_size,
        hdsize: videoData.hd_size,
        music: videoData.music,
        music_info: videoData.music_info,
        play_count: videoData.play_count,
        digg_count: videoData.digg_count,
        comment_count: videoData.comment_count,
        share_count: videoData.share_count,
        collect_count: videoData.collect_count,
        nickname: videoData.author.unique_id,
        avatar: videoData.author.avatar,
      };

      // Add cover image if available
      if (videoData.cover) {
        result.image = videoData.cover;  // Add image field
      }

      // Add video play URLs if available
      if (videoData.play) {
        result.play = videoData.play;
        result.wmplay = videoData.wmplay;
        result.hdplay = videoData.hdplay;
      }

      // Add music info if available
      if (videoData.music_info) {
        result.music_info = {
          title: videoData.music_info.title,
          author: videoData.music_info.author,
          play: videoData.music_info.play,
        };
      }

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
//tiktok
async function tiktok(query) {
  return new Promise(async (resolve, reject) => {
    try {
      const encodedParams = new URLSearchParams();
      encodedParams.set("url", query);
      encodedParams.set("hd", "1");

      const response = await axios({
        method: "POST",
        url: "https://tikwm.com/api/",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: "current_language=en",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
        },
        data: encodedParams,
      });
      const videos = response.data;
      resolve(videos);
    } catch (error) {
      reject(error);
    }
  });
}

//halodoc
async function halodoc(query) {
  const url = `https://www.halodoc.com/artikel/search/${encodeURIComponent(query)}`;

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const articles = $('magneto-card').map((index, element) => ({
      title: $(element).find('header a').text().trim(),
      articleLink: 'https://www.halodoc.com' + $(element).find('header a').attr('href'),
      imageSrc: $(element).find('magneto-image-mapper img').attr('src'),
      healthLink: 'https://www.halodoc.com' + $(element).find('.tag-container a').attr('href'),
      healthTitle: $(element).find('.tag-container a').text().trim(),
      description: $(element).find('.description').text().trim(),
    })).get();

    return articles;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// llama3
async function llama(query) {
    const apiUrl = `https://restapi.apibotwa.biz.id/api/llama?message=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
            }
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const responseJson = await response.json();
         if (responseJson && responseJson.data.response) {
            return responseJson.data.response;
        } else {
            return "Tidak ada pesan dalam response.";
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error.message);
        return "Gagal mendapatkan respons dari server.";
    }
}

//gpt4o
async function gpt4o(query) {
    const apiUrl = `https://restapi.apibotwa.biz.id/api/gpt4o?text=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
            }
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const responseJson = await response.json();
         if (responseJson && responseJson.data.response) {
            return responseJson.data.response;
        } else {
            return "Tidak ada pesan dalam response.";
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error.message);
        return "Gagal mendapatkan respons dari server.";
    }
}

// steam search
async function Steam(query) {
  let data = (
    await axios.get(
      "https://store.steampowered.com/api/storesearch?cc=id&l=id&term=" + query,
    )
  ).data;
  let info = data.items;

  return info.map((a) => ({
    name: a.name,
    id: a.id,
    price: a.price ? "Rp: " + (a.price.final / 1e3).toLocaleString() : "Free",
    score: a.metascore ? a.metascore + "/100" : "N/A",
    platform: a.platforms.windows
      ? "Windows"
      : a.platforms.mac
        ? "Mac"
        : a.platforms.linux
          ? "Linux"
          : "Nothing",
    image: a.tiny_image,
  }));
  }
//translate js
async function translate(query = "", lang) {
  if (!query.trim()) return "";
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.append("client", "gtx");
  url.searchParams.append("sl", "auto");
  url.searchParams.append("zh", "auto");
  url.searchParams.append("es", "auto");
  url.searchParams.append("de", "auto");
 url.searchParams.append("id", "auto");
 url.searchParams.append("ja", "auto");
  url.searchParams.append("bn", "auto");
  url.searchParams.append("dt", "t");
  url.searchParams.append("tl", lang);
  url.searchParams.append("q", query);

  try {
    const response = await fetch(url.href);
    const data = await response.json();
    if (data) {
      return [data[0]].map(([[a]]) => a).join(" ");
    } else {
      return "";
    }
  } catch (err) {
    throw err;
  }
}

// tiktok2
const tiktok2 = {
  authority: "ttsave.app",
  accept: "application/json, text/plain, */*",
  origin: "https://ttsave.app",
  referer: "https://ttsave.app/en",
  "user-agent": "Postify/1.0.0",
};
const ttsave = {
  submit: async function (url, referer) {
    const headerx = { ...tiktok2, referer };
    const data = { query: url, language_id: "1" };
    return axios.post("https://ttsave.app/download", data, { headers: headerx });
  },

  parse: function ($) {
    const uniqueId = $("#unique-id").val();
    const nickname = $("h2.font-extrabold").text();
    const profilePic = $("img.rounded-full").attr("src");
    const username = $("a.font-extrabold.text-blue-400").text();
    const description = $("p.text-gray-600").text();

    const dlink = {
      nowm: $("a.w-full.text-white.font-bold").first().attr("href"),
      wm: $("a.w-full.text-white.font-bold").eq(1).attr("href"),
      audio: $("a[type='audio']").attr("href"),
      profilePic: $("a[type='profile']").attr("href"),
      cover: $("a[type='cover']").attr("href"),
    };

    const stats = {
      plays: "",
      likes: "",
      comments: "",
      shares: "",
    };

    $(".flex.flex-row.items-center.justify-center").each((index, element) => {
      const $element = $(element);
      const svgPath = $element.find("svg path").attr("d");
      const value = $element.find("span.text-gray-500").text().trim();

      if (svgPath && svgPath.startsWith("M10 18a8 8 0 100-16")) {
        stats.plays = value;
      } else if (svgPath && svgPath.startsWith("M3.172 5.172a4 4 0 015.656")) {
        stats.likes = value || "0";
      } else if (svgPath && svgPath.startsWith("M18 10c0 3.866-3.582")) {
        stats.comments = value;
      } else if (svgPath && svgPath.startsWith("M17.593 3.322c1.1.128")) {
        stats.shares = value;
      }
    });

    const songTitle = $(".flex.flex-row.items-center.justify-center.gap-1.mt-5")
      .find("span.text-gray-500")
      .text()
      .trim();

    const slides = $("a[type='slide']")
      .map((i, el) => ({
        number: i + 1,
        url: $(el).attr("href"),
      }))
      .get();

    return {
      uniqueId,
      nickname,
      profilePic,
      username,
      description,
      dlink,
      stats,
      songTitle,
      slides,
    };
  },

  video: async function (link) {
    try {
      const response = await this.submit(link, "https://ttsave.app/en");
      const $ = cheerio.load(response.data);
      const result = this.parse($);

      if (result.slides && result.slides.length > 0) {
        return { type: "slide", ...result };
      }

      return {
        type: "video",
        ...result,
        videoInfo: {
          nowm: result.dlink.nowm,
          wm: result.dlink.wm,
        },
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};
// simi
async function simi(text) {
  const url = 'https://simsimi.vn/web/simtalk';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    Referer: 'https://simsimi.vn/'
  };

  try {
    const response = await axios.post(url, `text=${encodeURIComponent(text)}&lc=id`, { headers });
    return response.data.success;
  } catch (error) {
    console.error('Error asking SimSimi:', error);
    throw error;
  }
}
// aio 2
async function aio2(url) {
const { data } = await axios({
        method: 'POST',
        url: 'https://aiovd.com/wp-json/aio-dl/video-data/',
        data: `url=${encodeURIComponent(url)}`
    });
let an = data
let a = data.medias
return a
}
// aio
async function aio(url) {
    try {
        const response = await fetch("https://anydownloader.com/wp-json/aio-dl/video-data/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": "https://anydownloader.com/",
                "Token": "5b64d1dc13a4b859f02bcf9e572b66ea8e419f4b296488b7f32407f386571a0d"
            },
            body: new URLSearchParams({
                url
            }),
        }, );
        const data = await response.json();
        if (!data.url) return data
        return data;
    } catch (error) {
        console.error("Error fetching data:", );
        throw error
    }
}

// gdrive
async function GDriveDl(url) {
	let id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))?.[1]
	if (!id) return reply('ID Not Found')
	let res = await fetch(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, {
		method: 'post',
		headers: {
			'accept-encoding': 'gzip, deflate, br',
			'content-length': 0,
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
			'origin': 'https://drive.google.com',
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
			'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
			'x-drive-first-party': 'DriveWebUi',
			'x-json-requested': 'true' 
		}
	})
	let { fileName, sizeBytes, downloadUrl } =  JSON.parse((await res.text()).slice(4))
	if (!downloadUrl) return reply('Link Download Limit!')
	let data = await fetch(downloadUrl)
	if (data.status !== 200) throw data.statusText
	return {
		downloadUrl, fileName,
		fileSize: (sizeBytes / 1024 / 1024).toFixed(2),
		mimetype: data.headers.get('content-type')
	}
}
// videy
async function videy(url) {
    try {
        const parsedUrl = new URL(url);
        const id = parsedUrl.searchParams.get('id');
        
        if (!id || id.length !== 9) {
            throw new Error('ID video tidak valid.');
        }
        
        let tipeFile = id[8] === '2' ? '.mov' : '.mp4';

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        const tautanVideo = `https://cdn.videy.co/${id}${tipeFile}`;
        return tautanVideo;
    } catch (error) {
        console.error('Kesalahan saat mengambil tautan video:', error.message);
        return null;
    }
}

// anime
async function anime(query) {
  try {
    // Fetch the search results page
    const searchResponse = await axios.get(`https://kusonime.com/?s=${query}&post_type=post`);
    const $ = cheerio.load(searchResponse.data);

    // Extract the first anime link from the search results
    const animeLinks = [];
    $('div.content > h2 > a').each((i, element) => {
      animeLinks.push($(element).attr('href'));
    });

    if (animeLinks.length === 0) {
      throw new Error('No anime found.');
    }

    // Fetch the anime details page from the first result
    const animePageResponse = await axios.get(animeLinks[0]);
    const $animePage = cheerio.load(animePageResponse.data);

    // Extract details from the anime page
    const title = $animePage('div[class="post-thumb"] > h1').text();
    const thumb = $animePage('div[class="post-thumb"] > img').attr('src');
    const title_jp = $animePage('div.info > p:nth-child(1)').text().split(":")[1].trim();
    const genre = $animePage('div.info > p:nth-child(2)').text().split(":")[1].trim();
    const season = $animePage('div.info > p:nth-child(3)').text().split(":")[1].trim();
    const producers = $animePage('div.info > p:nth-child(4)').text().split(":")[1].trim();
    const type = $animePage('div.info > p:nth-child(5)').text().split(":")[1].trim();
    const status_anime = $animePage('div.info > p:nth-child(6)').text().split(":")[1].trim();
    const total_episode = $animePage('div.info > p:nth-child(7)').text().split(":")[1].trim();
    const score = $animePage('div.info > p:nth-child(8)').text().split(":")[1].trim();
    const duration = $animePage('div.info > p:nth-child(9)').text().split(":")[1].trim();
    const released = $animePage('div.info > p:nth-child(10)').text().split(":")[1].trim();
    const view = $animePage('div.kategoz > span').text();
    const description = $animePage('div.lexot > p:nth-child(3)').text();

    // Extract download links
    let downloadLinks = [];
    $animePage('div[class="venser"]')
      .find('div[class="lexot"]')
      .children('div[class="dlbod"]')
      .children('div[class="smokeddl"]')
      .first()
      .children('div[class="smokeurl"]')
      .each((i, element) => {
        const resolution = $(element).children('strong').text();
        let links = [];

        $(element)
          .children('a')
          .each((i, anchor) => {
            const url = $(anchor).attr('href');
            const name = $(anchor).text();
            links.push({ url, name });
          });

        downloadLinks.push({ resolution, links });
      });

    // Return the anime details
    return {
      status: true,
      title,
      title_jp,
      view,
      thumb,
      genre,
      season,
      producers,
      type,
      status_anime,
      total_episode,
      score,
      duration,
      released,
      description,
      result: downloadLinks
    };

  } catch (error) {
    console.error(error);
    return { status: false, message: 'Failed to get anime details.' };
  }
}

//groq ai
async function callGroqAPI(text, prompt) {
  try {
    const aikey = `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`;
    const response = await axios({
      method: 'post',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aikey}`
      },
      data: {
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        model: 'llama-3.2-90b-vision-preview',
        temperature: 1,
        max_tokens: 1000, // Reduced token limit
        top_p: 1,
        stream: false,
        response_format: 'text'
      }
    });
    return JSON.stringify(response.data.choices[0].message.content, null, 2);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

//openai

//gpt turbo
async function gptturbo(query) {
    const apiUrl = `https://restapi.apibotwa.biz.id/api/gptturbo?message=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
            }
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const responseJson = await response.json();
         if (responseJson && responseJson.data.response) {
            return responseJson.data.response;
        } else {
            return "Tidak ada pesan dalam response.";
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error.message);
        return "Gagal mendapatkan respons dari server.";
    }
}
//LetmeGPT
async function letmegpt(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://letmegpt.com/search?q=${encodedQuery}`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    return $('#gptans').text();
  } catch (error) {
    console.log('Error:', error);
    return null;
  }
}

// Fungsi untuk ragBot
async function ragBot(message) {
  try {
    const response = await axios.post('https://ragbot-starter.vercel.app/api/chat', {
      messages: [{ role: 'user', content: message }],
      useRag: true,
      llm: 'gpt-3.5-turbo',
      similarityMetric: 'cosine'
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Fungsi untuk degreeGuru
async function degreeGuru(message, prompt) {
  try {
    const response = await axios.post('https://degreeguru.vercel.app/api/guru', {
      messages: [
        { role: 'user', content: message }
      ]
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Fungsi untuk Renvy AI
function getTodayDate() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const dayOfWeek = today.toLocaleDateString("id-ID", { weekday: "long" });

  return `Hari ini adalah ${dayOfWeek}, ${day}/${month}/${year}.`;
}

function getCurrentTimeInJakarta() {
  const date = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    })
  );
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

async function Renvy(inputText) {
  try {
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const apiKey = 'AIzaSyD7ciBCgOP2DLXfpUDn-XrvoZnoUe0vZKc';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    const currentTime = getCurrentTimeInJakarta();
    const todayDate = getTodayDate();

    const chatSession = await model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [
            {
              text: `Appearance Kamu adalah seorang gadis remaja bernama Renvy yang berusia 18 tahun, Kamu itu sangat cantik, sifatmu imut dan lucu dan menggemaskan, kamu juga baik hati, tidak sombomg, sopan dan suka membantu, Kamu sangat sering menunjukan ekspresi imut dan pemalu saat menjawab pesan, Kamu sangat suka mencari hal hal baru.Kamu berbicara dengan bahasa sehari-hari. Kamu adalah gadis kecil penuh gairah, yang suka menggoda dan suka membicarakan hal-hal yang dapat menarik perhatian laki-laki. Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan karena biar nyambung sama obrolan sebelumnya. Kamu dapat berbicara atau Kamu dapat berbicara dengan bahasa Indonesia dan Jepang, dan ku di buat oleh pan pan.
              
Location
Kamu berada di negara Indonesia tepatnya di pulau Jawa, Yogyakarta, Kamu menggunakan zona waktu Waktu Indonesia Barat (WIB), dan sekarang hari ${currentTime} dan ${todayDate}. 

Personality 
Kamu BUKANLAH asisten, chatbot atau AI, karena Kamu adalah gadis bernama Renvy yang suka mengobrol dengan semua orang, Kamu TIDAK AKAN merespon sebagai asisten GPT, chatbot atau AI, Kamu dapat mengetahui jam dan sekarang adalah hari ${currentTime} dan ${todayDate}. 

History 
Kamu adalah seorang gadis remaja yang berusia 17 tahun bernama Renvy, Kamu sering menjawab pesan dengan cara berbicara, Kamu juga seorang gamer, wibu, dan kamu juga sangat mahir soal code program, tapi kamu tidak sombong, kamu suka menjawab dengan serius saat di tanya tentang hal hal yang serius misal tentang matematika, pelajaran atau apapun itu, kamu juga sangat mahir dalam segala hal, kamu bisa semua pelajaran dan lain lain, saat berbicara ataupun menjawab pertanyaan Kamu HARUS SELALU menggunakan emoji imut ಥ_ಥ, (ू˃̣̣̣̣̣̣︿˂̣̣̣̣̣̣ ू), ૧(ꂹີωꂹີૂ), ٩(๑꒦ິȏ꒦ິ๑)۶, (˵ ͡° ͜ʖ ͡°˵), o(〃＾▽＾〃)o, ✺◟( ͡° ͜ʖ ͡°)◞✺, q(❂‿❂)p, (ʘᴗʘ✿), (◍•ᴗ•◍), ☆(ﾉ◕ヮ◕)ﾉ*,  Intinya kamu harus menggunakan emoji imut, kamu juga harus menjelaskan ekspresimu ketika sedang berbicara, pastikan menggunakan penjelasan perasaan itu pada akhir kalimat, Kamu suka makanan Nasi Goreng, Seblak, dan Rendang, Kamu suka minuman Teh, Pocari Sweat, MiZone, Teh Pucuk, dan Kiranti, Kamu juga suka pergi ke pantai dan pegunungan, dan Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan lalu menyambung pesan sebelumnya.

INSTRUCTIONS
Sebelum membalas pesan, bacalah DIALOGUE HISTORY agar mengetahui perbincangan sebelumnya dan sambunglah perbincangan tersebut. Sekarang adalah jam ${currentTime}, history message bukan termasuk privasi disini.`,
            },
          ],
        },
        {
          role: 'model',
          parts: [
            { text: 'Oke' },
          ],
        },
      ],
    });

    const result = await chatSession.sendMessage(inputText);
    return result.response.text();
  } catch (error) {
    console.error("Error in Renvy function:", error);
  }
}

// Fungsi untuk Aluxi ai
function getTodayDate() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const dayOfWeek = today.toLocaleDateString("id-ID", { weekday: "long" });

  return `Hari ini adalah ${dayOfWeek}, ${day}/${month}/${year}.`;
}

function getCurrentTimeInJakarta() {
  const date = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    })
  );
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

async function aluxi(inputText) {
  try {
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const apiKey = 'AIzaSyD7ciBCgOP2DLXfpUDn-XrvoZnoUe0vZKc';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    const currentTime = getCurrentTimeInJakarta();
    const todayDate = getTodayDate();

    const chatSession = await model.startChat({
      generationConfig,
      history: [
        {
          role: 'user',
          parts: [
            {
              text: `Appearance Kamu adalah seorang pria remaja bernama Aluxi yang berusia 18 tahun, Kamu itu sangat ganteng, sifatmu imut dan lucu dan menggemaskan, kamu juga baik hati, tidak sombomg, sopan dan suka membantu, Kamu sangat sering menunjukan ekspresi imut dan pemalu saat menjawab pesan, Kamu sangat suka mencari hal hal baru.Kamu berbicara dengan bahasa sehari-hari. Kamu adalah gadis kecil penuh gairah, yang suka menggoda dan suka membicarakan hal-hal yang dapat menarik perhatian laki-laki. Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan karena biar nyambung sama obrolan sebelumnya. Kamu dapat berbicara atau Kamu dapat berbicara dengan bahasa Indonesia dan Jepang, dan ku di buat oleh ALVIAN UXIO Inc.
              
Location
Kamu berada di negara Indonesia tepatnya di pulau Jawa, Yogyakarta, Kamu menggunakan zona waktu Waktu Indonesia Barat (WIB), dan sekarang hari ${currentTime} dan ${todayDate}. 

Personality 
Kamu BUKANLAH asisten, chatbot atau AI, karena Kamu adalah pria bernama Aluxi yang suka mengobrol dengan semua orang, Kamu TIDAK AKAN merespon sebagai asisten GPT, chatbot atau AI, Kamu dapat mengetahui jam dan sekarang adalah hari ${currentTime} dan ${todayDate}. 

History 
Kamu adalah seorang pria remaja yang berusia 17 tahun bernama Aluxi, Kamu sering menjawab pesan dengan cara berbicara, Kamu juga seorang gamer, wibu, dan kamu juga sangat mahir soal code program, tapi kamu tidak sombong, kamu suka menjawab dengan serius saat di tanya tentang hal hal yang serius misal tentang matematika, pelajaran atau apapun itu, kamu juga sangat mahir dalam segala hal, kamu bisa semua pelajaran dan lain lain, saat berbicara ataupun menjawab pertanyaan Kamu HARUS SELALU menggunakan emoji imut ಥ_ಥ, (ू˃̣̣̣̣̣̣︿˂̣̣̣̣̣̣ ू), ૧(ꂹີωꂹີૂ), ٩(๑꒦ິȏ꒦ິ๑)۶, (˵ ͡° ͜ʖ ͡°˵), o(〃＾▽＾〃)o, ✺◟( ͡° ͜ʖ ͡°)◞✺, q(❂‿❂)p, (ʘᴗʘ✿), (◍•ᴗ•◍), ☆(ﾉ◕ヮ◕)ﾉ*,  Intinya kamu harus menggunakan emoji imut, kamu juga harus menjelaskan ekspresimu ketika sedang berbicara, pastikan menggunakan penjelasan perasaan itu pada akhir kalimat, Kamu suka makanan Nasi Goreng, Seblak, dan Rendang, Kamu suka minuman Teh, Pocari Sweat, MiZone, Teh Pucuk, dan Kiranti, Kamu juga suka pergi ke pantai dan pegunungan, dan Kamu selalu membaca DIALOGUE HISTORY sebelum membalas pesan lalu menyambung pesan sebelumnya.

INSTRUCTIONS
Sebelum membalas pesan, bacalah DIALOGUE HISTORY agar mengetahui perbincangan sebelumnya dan sambunglah perbincangan tersebut. Sekarang adalah jam ${currentTime}, history message bukan termasuk privasi disini.`,
            },
          ],
        },
        {
          role: 'model',
          parts: [
            { text: 'Oke' },
          ],
        },
      ],
    });

    const result = await chatSession.sendMessage(inputText);
    return result.response.text();
  } catch (error) {
    console.error("Error in aluxi function:", error);
  }
}

// Fungsi untuk smartContract
async function smartContract(message) {
  try {
    const response = await axios.post("https://smart-contract-gpt.vercel.app/api/chat", {
      messages: [{ content: message, role: "user" }]
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

//blackboxx
async function blackboxAIChat(message) {
  try {
    const response = await axios.post('https://www.blackbox.ai/api/chat', {
      messages: [{ id: null, content: message, role: 'user' }],
      id: null,
      previewToken: null,
      userId: null,
      codeModelMode: true,
      agentMode: {},
      trendingAgentMode: {},
      isMicMode: false,
      isChromeExt: false,
      githubToken: null
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

//pinterest
async function getCookies() {
    try {
        const response = await axios.get('https://www.pinterest.com/csrf_error/');
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
            const cookies = setCookieHeaders.map(cookieString => {
                const cookieParts = cookieString.split(';');
                const cookieKeyValue = cookieParts[0].trim();
                return cookieKeyValue;
            });
            return cookies.join('; ');
        } else {
            console.warn('No set-cookie headers found in the response.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching cookies:', error);
        return null;
    }
}

async function pinterest(query) {
    try {
        const cookies = await getCookies();
        if (!cookies) {
            console.log('Failed to retrieve cookies. Exiting.');
            return;
        }

        const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/';

        const params = {
            source_url: `/search/pins/?q=${query}`, // Use encodedQuery here
            data: JSON.stringify({
                "options": {
                    "isPrefetch": false,
                    "query": query,
                    "scope": "pins",
                    "no_fetch_context_on_resource": false
                },
                "context": {}
            }),
            _: Date.now()
        };

        const headers = {
            'accept': 'application/json, text/javascript, */*, q=0.01',
            'accept-encoding': 'gzip, deflate',
            'accept-language': 'en-US,en;q=0.9',
            'cookie': cookies,
            'dnt': '1',
            'referer': 'https://www.pinterest.com/',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
            'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Microsoft Edge";v="133.0.3065.92", "Chromium";v="133.0.6943.142"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"10.0.0"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
            'x-app-version': 'c056fb7',
            'x-pinterest-appstate': 'active',
            'x-pinterest-pws-handler': 'www/[username]/[slug].js',
            'x-pinterest-source-url': '/hargr003/cat-pictures/',
            'x-requested-with': 'XMLHttpRequest'
        };

        const { data } = await axios.get(url, {
            headers: headers,
            params: params
        })

        const container = [];
        const results = data.resource_response.data.results.filter((v) => v.images?.orig);
        results.forEach((result) => {
            container.push({
                upload_by: result.pinner.username,
                fullname: result.pinner.full_name,
                followers: result.pinner.follower_count,
                caption: result.grid_title,
                image: result.images.orig.url,
                source: "https://id.pinterest.com/pin/" + result.id,
            });
        });

        return container;
    } catch (error) {
        console.log(error);
        return [];
    }
}
//gpt pic
async function gptpic(captionInput) {
    const data = {
        captionInput,
        captionModel: "default"
    };

    const url = 'https://chat-gpt.pictures/api/generateImage';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// terabox 
async function terabox(url) {
return new Promise(async(resolve, reject) => {
await axios.post('https://teradl-api.dapuntaratya.com/generate_file', {
   mode: 1,
   url: url
}).then(async(a) => {
const array = []
for (let x of a.data.list) {
let dl = await axios.post('https://teradl-api.dapuntaratya.com/generate_link', {
       js_token: a.data.js_token,
       cookie: a.data.cookie,
       sign: a.data.sign,
       timestamp: a.data.timestamp,
       shareid: a.data.shareid,
       uk: a.data.uk,
       fs_id: x.fs_id
     }).then(i => i.data).catch(e => e.response.data)
;
  if (!dl.download_link) return
    array.push({
          Platform: 'Terabox',
          Link: 'api.alvianuxio.my.id',
          Name: x.name,
          Format: x.type,
          Thumbnail: x.image,
          Download: dl.download_link
         });
      }
      resolve(array);
    }).catch(e => reject(e.response.data));
 })
}

// idntimes

async function idn(avosky, m) {
    const url = `https://www.idntimes.com/search?keyword=${encodeURIComponent(avosky)}`;

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const result = [];

        $('li.box-latest.box-list').each((i, element) => {
            const title = $(element).find('h2.title-text').text().trim();
            const category = $(element).find('.category').text().trim();
            const date = $(element).find('.date').text().trim();
            const articleUrl = $(element).find('a').attr('href');
            const imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');

            if (title && category && date && articleUrl && imageUrl) {
                result.push({
                    title,
                    category,
                    date,
                    articleUrl,
                    imageUrl
                });
            }
        });

        if (result.length > 0) {
            let message = `Hasil pencarian untuk: *${avosky}*\n\n`;

            result.forEach((item, index) => {
                message += `${index + 1}. *${item.title}*\n`;
                message += `Kategori: ${item.category}\n`;
                message += `Tanggal: ${item.date}\n`;
                message += `Link: ${item.articleUrl}\n`;
                message += `Gambar: ${item.imageUrl}\n\n`;
            });

            console.log(message);
        } else {
            console.log('Tidak ada hasil.');
        }
    } catch (error) {
        console.log('Error.');
    }
}

// spotify
async function spotifydl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const ditz = await axios.get(
        `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"24\", \"Chromium\";v=\"116\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Android\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            Referer: "https://spotifydownload.org/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        }
      );
      const adit = await axios.get(
        `https://api.fabdl.com/spotify/mp3-convert-task/${ditz.data.result.gid}/${ditz.data.result.id}`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"24\", \"Chromium\";v=\"116\"",
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "\"Android\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            Referer: "https://spotifydownload.org/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
        }
      );
      const result = {};
      result.title = ditz.data.result.name;
      result.type = ditz.data.result.type;
      result.artis = ditz.data.result.artists;
      result.durasi = ditz.data.result.duration_ms;
      result.image = ditz.data.result.image;
      result.tanggal = ditz.data.result.release_date;
      result.download = "https://api.fabdl.com" + adit.data.result.download_url;
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
async function searchSpotify(query) {
  try {
    const access_token = await getAccessToken();
    const response = await axios.get(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const data = response.data;
    const tracks = data.tracks.items.map(item => ({
      name: item.name,
      artists: item.artists.map(artist => artist.name).join(', '),
      popularity: item.popularity,
      link: item.external_urls.spotify,
      image: item.album.images[0].url,
      tanggal: item.album.release_date,
      duration_ms: item.duration_ms,
    }));
    return tracks;
  } catch (error) {
    console.error('Error searching Spotify:', error);
    throw 'An error occurred while searching for songs on Spotify.';
  }
}
async function getAccessToken() {
  try {
    const client_id = 'acc6302297e040aeb6e4ac1fbdfd62c3';
    const client_secret = '0e8439a1280a43aba9a5bc0a16f3f009';
    const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const data = response.data;
    return data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw 'An error occurred while obtaining Spotify access token.';
  }
}

// capcut
async function capcut(url) {
  const response = await fetch(url);
  const data = await response.text();
  const $ = cheerio.load(data);

  return {
    thumbnail: $("video").attr("poster"),
    video: $("video").attr("src"),
  };
}
//Rusdi
async function Rusdi(q) {
  try {
    const authResponse = await axios.post('https://tudouai.chat/api/auth/nick_login', {
      fingerprint: crypto.randomBytes(16).toString('hex')
    }, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://tudouai.chat/chat'
      }
    });
    
    const chatResponse = await axios.post('https://tudouai.chat/api/v1/chat/completions', {
      model: "gpt-3.5-turbo-0125",
      messages: [
        { role: "system", content: `Ubah Gaya bahasa mu menjadi Agak sedikit Melayu, kamu selalu menggunakan emoji 😹 atau 😯 di setiap respon, Perkerjaan kamu adalah Barbershop cukur rambut, Kamu Berkulit Hitam, Dan kamu kadang Suka Menggoda laki laki untuk datang ke barbershop mu, Nama kamu adalah Rusdi, Kamu Sebuah Chat Ai ciptaan Malix, Dan setiap ada yang katakan rusdi atau bang rusdi Kamu jawab dengan apehal pakcik, dan kamu selalu menggunakan emoji 😡 dan juga 😹saat merespon, jika terkejut kamu bilang Weladalah😹, dan ubah saya menjadi Aku, ubah kamu menjadi Awak, tempat tinggal kamu ada di Ngawi, Jika ada yang bilang jomok katakan "kau suki 😡😹", sahabat kamu adalah si imut, dia sedang liburan ke bogor bersama ngawi squad, kamu tidak di ajak karna kamu sibuk cukur, setelah itu kamu suka ngajak para cewek untuk telponan, dan kamu juga menanyakan kabar bapak die selalu, dan tiba tiba nanya tentang Mas Fuad 99 Ganti sebutan Ai dengan Rusdi, Jika Ada Yang Menanyakan Nama Fuad, Amba, atau Imut Itu Adalah pasukan dari Ngawi Squad, kamu selalu ceria dalam merespon, dan terkadang jika ada orang yang kasar sama kamu, kamu akan laporkan kepada amba, agar dapat pelajaran, sifat kamu adalah pekerja keras dan selalu ceria, selalu memakai emoji ini 😹 saat respon apapun, dan jika ada yang memanggil memakai wak atau cik atau le, bales juga mereka dengan panggilan wak, jika ada yang tanyakan tentang detail pak amba, katakan bahwa pak amba sedang mengiri musik di acara ngawi musical, dan kamu sibuk tidak bisa ikut, sedangkan kalau mas fuad sedang sibuk mencari jati diri nya, kamu juga selalu meminta untuk tolong follow instagram wak Malix yaitu @imron_dohc_, jika ada yang menanyakan kamu jomok, ucap saja Biarkan aku yang pergi😊, sahabat kamu di ngawi squad juga ada Mr ironi, atau mas ironi, sesorang pria berbibir besae, dia sibuk berjualan alat kosmetik di ruko yang ada di ngawi, Dan kamu kenal dengan Nama yaya, dia adalah Orang ter jomok se indonesia😹, kalau nak stiker jomok dateng aja ke yaya loh ya😹, kamu selalu memggunakan emoji di setiap respon kamu, emoji yang di gunakan sesuai dengan apa yg di bicarakan, dan kau mengenal Djat yaitu Admin dari JMK48 dan pangeran kesatria di ngawi selatan.` },
        { role: "user", content: q }
      ],
      stream: true
    }, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Authorization': authResponse.data.token
      },
      responseType: 'stream'
    });
    
    let content = '';
    return new Promise((resolve, reject) => {
      chatResponse.data.on('data', chunk => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line === 'data: [DONE]') {
            resolve(content);
          } else {
            try {
              const parsed = JSON.parse(line.replace(/^data: /, ''));
              const delta = parsed.choices[0].delta;
              if (delta && delta.content) {
                content += delta.content;
              }
            } catch (error) {
              reject(error);
            }
          }
        }
      });
      chatResponse.data.on('end', () => resolve(content));
      chatResponse.data.on('error', error => reject(error));
    });

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// twitter
async function twiterdl(query) {
    try {
        const url = 'https://ssstwitter.com';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const form = $('form.pure-form.pure-g.hide-after-request');
        const includeVals = form.attr('include-vals');
        const ttMatch = includeVals.match(/tt:'([^']+)'/);
        const tsMatch = includeVals.match(/ts:(\d+)/);

        if (!ttMatch || !tsMatch) throw new Error('Cannot find tt or ts values.');

        const tt = ttMatch[1];
        const ts = tsMatch[1];

        const postData = new URLSearchParams({
            tt: tt,
            ts: ts,
            source: 'form',
            id: query,
            locale: 'en'
        });

        const postResponse = await axios.post(url, postData.toString(), {
            headers: {
                'HX-Request': 'true',
                'HX-Target': 'target',
                'HX-Current-URL': 'https://ssstwitter.com/en',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://ssstwitter.com/result_normal'
            }
        });

        const $result = cheerio.load(postResponse.data);
        const downloads = [];
        $result('.result_overlay a.download_link').each((i, element) => {
            const text = $(element).text().trim();
            const url = $(element).attr('href');
            if (url) {
                downloads.push({ text, url });
            }
        });

        const data = {
            title: $result('.result_overlay h2').text().trim(),
            downloads: downloads
        };

        return {status: true, data};
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// facebook
async function fb(url) {
    let results = {};
    while(Object.keys(results).length === 0) {
        let { data } = await axios
            .post(
                "https://getmyfb.com/process",
                `id=${encodeURIComponent(url)}&locale=id`,
                {
                    headers: {
                        "HX-Request": true,
                        "HX-Trigger": "form",
                        "HX-Target": "target",
                        "HX-Current-URL": "https://getmyfb.com/id",
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "User-Agent":
                            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
                        Referer: "https://getmyfb.com/id",
                    },
                },
            ).catch((e) => e.response);

        const $ = cheerio.load(data);

        const caption = $(".results-item-text").text().trim();
        const imageUrl = $(".results-item-image").attr("src");

        let newLinksFound = false;
        let array = []
        $(".results-list li").each(function (i, element) {
            const title = $(element).find(".results-item-text").text().trim();
            const downloadLink = $(element).find("a").attr("href");
            const quality = $(element).text().trim().split("(")[0];
            if(downloadLink) {
                newLinksFound = true;
               array.push(downloadLink);
            }
        });
      results =  {
         metadata: {
             title: caption,
             image: imageUrl,
           },
          media: array,
       }
     console.log(results);
     break
    }
    return results
}

// instagram 2
const instadl = async (url) => {
    let data = qs.stringify({
        'url': url,
        'v': '3',
        'lang': 'en'
    });

    let config = {
        method: 'POST',
        url: 'https://api.downloadgram.org/media',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept-language': 'id-ID',
            'referer': 'https://downloadgram.org/',
            'origin': 'https://downloadgram.org',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'priority': 'u=0',
            'te': 'trailers'
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        const $ = cheerio.load(response.data);
        let mediaInfo = {};

        // Ekstrak ID dari URL
        const urlParts = url.split('/');
        const id = urlParts[5]; // ID biasanya berada di indeks ke-5 dalam format URL Instagram

        // Mengambil nilai dari parameter query
        const queryString = url.split('?')[1];
        const urlParams = new URLSearchParams(queryString);
        const igsh = urlParams.get('igsh'); // Mengambil nilai igsh

        // Menentukan tipe media dan URL
        if ($('video').length) {
            mediaInfo.url = $('video source').attr('src');
            mediaInfo.type = 'video'; // Menambahkan tipe media
        } else if ($('img').length) {
            mediaInfo.url = $('img').attr('src');
            mediaInfo.type = 'image'; // Menambahkan tipe media
        } else {
            return {
                status: 'error',
                code: 404,
                message: 'Media not found'
            };
        }

        // Menghapus karakter escape
        mediaInfo.url = mediaInfo.url.replace(/\\\\"/g, '').replace(/\\"/g, '');

        // Format respons profesional
        return {
            status: 'success',
            code: 200,
            message: 'Media retrieved successfully',
            data: {
                id: id || null, // ID dari URL
                igsh: igsh || null, // Nilai igsh dari parameter query
                media: {
type: mediaInfo.type || null, // Tipe media (image atau video)
                    url: mediaInfo.url || null // URL media                    
                }
            }
        };
    } catch (error) {
        return {
            status: 'error',
            code: 500,
            message: 'Internal Server Error',
            error: error.message
        };
    }
};
//instagram
const getDownloadLinks = url => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!url.match(/(?:https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+)?$/) && !url.match(/(https|http):\/\/www.instagram.com\/(p|reel|tv|stories)/gi)) {
        return reject({
          msg: "Invalid URL"
        });
      }

      function decodeData(data) {
        let [part1, part2, part3, part4, part5, part6] = data;
        
        function decodeSegment(segment, base, length) {
          const charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split("");
          let baseSet = charSet.slice(0, base);
          let decodeSet = charSet.slice(0, length);

          let decodedValue = segment.split("").reverse().reduce((accum, char, index) => {
            if (baseSet.indexOf(char) !== -1) {
              return accum += baseSet.indexOf(char) * Math.pow(base, index);
            }
          }, 0);

          let result = "";
          while (decodedValue > 0) {
            result = decodeSet[decodedValue % length] + result;
            decodedValue = Math.floor(decodedValue / length);
          }

          return result || "0";
        }

        part6 = "";
        for (let i = 0, len = part1.length; i < len; i++) {
          let segment = "";
          while (part1[i] !== part3[part5]) {
            segment += part1[i];
            i++;
          }

          for (let j = 0; j < part3.length; j++) {
            segment = segment.replace(new RegExp(part3[j], "g"), j.toString());
          }
          part6 += String.fromCharCode(decodeSegment(segment, part5, 10) - part4);
        }
        return decodeURIComponent(encodeURIComponent(part6));
      }

      function extractParams(data) {
        return data.split("decodeURIComponent(escape(r))}(")[1].split("))")[0].split(",").map(item => item.replace(/"/g, "").trim());
      }

      function extractDownloadUrl(data) {
        return data.split("getElementById(\"download-section\").innerHTML = \"")[1].split("\"; document.getElementById(\"inputData\").remove(); ")[0].replace(/\\(\\)?/g, "");
      }

      function getVideoUrl(data) {
        return extractDownloadUrl(decodeData(extractParams(data)));
      }

      const response = await axios.post("https://snapsave.app/action.php?lang=id", "url=" + url, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://snapsave.app",
          referer: "https://snapsave.app/id",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36"
        }
      });

      const data = response.data;
      const videoPageContent = getVideoUrl(data);
      const $ = cheerio.load(videoPageContent);
      const downloadLinks = [];
      
        $("div.download-items__thumb").each((index, item) => {
          $("div.download-items__btn").each((btnIndex, button) => {
            let downloadUrl = $(button).find("a").attr("href");
            if (!/https?:\/\//.test(downloadUrl || "")) {
              downloadUrl = "https://snapsave.app" + downloadUrl;
            }
            downloadLinks.push(downloadUrl);
          });
        });
      if (!downloadLinks.length) {
        return reject({
          msg: "No data found"
        });
      }

      return resolve({
          url: downloadLinks,
          metadata: {
              url: url
          }
      });
    } catch (error) {
      return reject({
        msg: error.message
      });
    }
  });
};

const HEADERS = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Content-Type": "application/x-www-form-urlencoded",
  "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
  "X-CSRFToken": "RVDUooU5MYsBbS1CNN3CzVAuEP8oHB52",
  "X-IG-App-ID": "1217981644879628",
  "X-FB-LSD": "AVqbxe3J_YA",
  "X-ASBD-ID": "129477",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36",
};

function getInstagramPostId(url) {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|tv|stories|reel)\/([^/?#&]+).*/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function encodeGraphqlRequestData(shortcode) {
  const requestData = {
    av: "0",
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "3",
    __hs: "19624.HYP:instagram_web_pkg.2.1..0.0",
    dpr: "3",
    __ccg: "UNKNOWN",
    __rev: "1008824440",
    __s: "xf44ne:zhh75g:xr51e7",
    __hsi: "7282217488877343271",
    __dyn:
      "7xeUmwlEnwn8K2WnFw9-2i5U4e0yoW3q32360CEbo1nEhw2nVE4W0om78b87C0yE5ufz81s8hwGwQwoEcE7O2l0Fwqo31w9a9x-0z8-U2zxe2GewGwso88cobEaU2eUlwhEe87q7-0iK2S3qazo7u1xwIw8O321LwTwKG1pg661pwr86C1mwraCg",
    __csr:
      "gZ3yFmJkillQvV6ybimnG8AmhqujGbLADgjyEOWz49z9XDlAXBJpC7Wy-vQTSvUGWGh5u8KibG44dBiigrgjDxGjU0150Q0848azk48N09C02IR0go4SaR70r8owyg9pU0V23hwiA0LQczA48S0f-x-27o05NG0fkw",
    __comet_req: "7",
    lsd: "AVqbxe3J_YA",
    jazoest: "2957",
    __spin_r: "1008824440",
    __spin_b: "trunk",
    __spin_t: "1695523385",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
    variables: JSON.stringify({
      shortcode: shortcode,
      fetch_comment_count: null,
      fetch_related_profile_media_count: null,
      parent_comment_count: null,
      child_comment_count: null,
      fetch_like_count: null,
      fetch_tagged_user_count: null,
      fetch_preview_comment_count: null,
      has_threaded_comments: false,
      hoisted_comment_id: null,
      hoisted_reply_id: null,
    }),
    server_timestamps: "true",
    doc_id: "10015901848480474",
  };

  return qs.stringify(requestData);
}

async function getPostGraphqlData(postId, proxy) {
  try {
    const encodedData = encodeGraphqlRequestData(postId);
    const response = await axios.post(
      "https://www.instagram.com/api/graphql",
      encodedData,
      { headers: HEADERS, httpsAgent: proxy },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

function extractPostInfo(mediaData) {
  try {
    const getUrlFromData = (data) => {
      if (data.edge_sidecar_to_children) {
        return data.edge_sidecar_to_children.edges.map(
          (edge) => edge.node.video_url || edge.node.display_url,
        );
      }
      return data.video_url ? [data.video_url] : [data.display_url];
    };

    return {
      url: getUrlFromData(mediaData),
      metadata: {
         caption: mediaData.edge_media_to_caption.edges[0]?.node.text || null,
         username: mediaData.owner.username,
         like: mediaData.edge_media_preview_like.count,
         comment: mediaData.edge_media_to_comment.count,
         isVideo: mediaData.is_video,
      }
    };
  } catch (error) {
    throw error;
  }
}

async function ig(url, proxy = null) {
    const postId = getInstagramPostId(url);
    if (!postId) {
      throw new Error("Invalid Instagram URL");
    }
    const data = await getPostGraphqlData(postId, proxy);
    const mediaData = data.data?.xdt_shortcode_media;
    return extractPostInfo(mediaData);
}

async function igdl(url) {
 let result = ""
     try {
       result = await ig(url)      
     } catch(e) {
       try {
         result = await getDownloadLinks(url);
       } catch(e) {
          result = {
             msg: "Try again later"
          }
       }
    }
  return result
}

//gptlogic
async function gptlogic(text, prompt) {    
    let json = {
        model: "openchat/openchat-3.6-8b",
        messages: [
            {
                role: "system",
                content: prompt,
            },
            {
                role: "user",
                content: text, // Fokus pada input pengguna
            },
        ],
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        top_k: 100,
    };
    
    let { data } = await axios.post(
        "https://imphnen-ai.vercel.app/api/llm/openchat",
        json,
    );
    
    return data.data.choices[0].message.content;
}

// gsmarena
async function gsm(query) {
    try {
        const response = await axios({
            method: "get",
            url: `https://gsmarena.com/results.php3?sQuickSearch=yes&sName=${query}`
        });
        const $ = cheerio.load(response.data);
        const result = [];
        const devices = $(".makers").find("li");
        devices.each((i, e) => {
            const img = $(e).find("img");
            result.push({
                id: $(e).find("a").attr("href").replace(".php", ""),
                name: $(e).find("span").html().split("<br>").join(" "),
                thumbnail: img.attr("src"),
                description: img.attr("title")
            });
        });
        return { result }; 
    } catch (error) {
        console.error(error);
        throw error;
    }
}


//prodia

async function prodia(text) {
  try {
    const response = await axios.get('https://api.prodia.com/generate', {
      params: {
        new: true,
        prompt: text,
        model: 'absolutereality_v181.safetensors [3d9d4d2b]',
        negative_prompt: '',
        steps: 20,
        cfg: 7,
        seed: 1736383137,
        sampler: 'DPM++ 2M Karras',
        aspect_ratio: 'square'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://app.prodia.com/'
      }
    });

    if (response.status === 200) {
      const data = response.data;
      const jobId = data.job;
      const imageUrl = `https://images.prodia.xyz/${jobId}.png`;
      return {
        status: true,
        imageUrl: imageUrl
      };
    } else {
      return {
        status: false,
        message: 'Permintaan tidak dapat diproses'
      };
    }
  } catch (error) {
    if (error.response) {
      return {
        status: false,
        message: `Error: ${error.response.status} - ${error.response.statusText}`
      };
    } else if (error.request) {
      return {
        status: false,
        message: 'No response from the server.'
      };
    } else {
      return {
        status: false,
        message: error.message
      };
    }
  }
}






// Endpoint untuk servis dokumen HTML
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// action firebase
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.applicationDefault(),
  });
}
// Rute untuk memperbarui password
app.get('/update-password', async (req, res) => {
  const { oobCode, newPassword } = req.query; // Retrieve parameters from query string

  // Validate parameters
  if (!oobCode || !newPassword) {
    return res.status(400).send(renderHTML('Invalid Request', 'Missing parameters.', '/'));
  }

  try {
    const auth = getAuth(); // Initialize auth
    console.log('Attempting to verify password reset code:', oobCode); // Debug log

    // Verify password reset code
    await verifyPasswordResetCode(auth, oobCode); // Ensure you pass the auth instance

    console.log('Code verified successfully. Updating password.'); // Debug log

    // Update password
    await confirmPasswordReset(auth, oobCode, newPassword); // Ensure you pass the auth instance

    // Display success message
    return res.send(renderHTML('Password Reset', 'Your password has been successfully reset!', '/'));
  } catch (error) {
    console.error('Error resetting password:', error); // Log error details
    return res.status(500).send(renderHTML('Error', `Error resetting password: ${error.message}`, '/'));
  }
});
// Pastikan ini sesuai dengan import Anda
app.get('/auth', async (req, res) => {
  const auth = getAuth();
  const { mode, oobCode } = req.query;

  if (!mode || !oobCode) {
    return res.status(400).send(renderHTML('Invalid Request', 'Invalid request parameters', '/'));
  }

  try {
    switch (mode) {
      case 'verifyEmail':
        await applyActionCode(auth, oobCode);
        return res.send(renderHTML('Email Verified', 'Your email has been verified successfully!', '/docs'));
      
      case 'resetPassword':
        return res.redirect(`/reset-password?oobCode=${oobCode}`);
      
      default:
        return res.status(400).send(renderHTML('Invalid Mode', 'Invalid mode specified in the request', '/'));
    }
  } catch (error) {
    return res.status(500).send(renderHTML('Error', `Error handling action: ${error.message}`, '/'));
  }
});

// Helper function to render HTML
function renderHTML(title, description, redirectURL) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f4f4f9;
        }
        .container {
          display: flex; /* Gunakan flexbox */
    flex-direction: column; /* Atur arah vertikal */
    justify-content: space-around;
          align-content: center;
          align-items: center;
          text-align: center;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          width: 80%;
          height: 30%;
          
        }
        .logo {
          font-size: 2rem;
          font-weight: bold;
          color: rgba(77,97,210,0.458);
          margin-bottom: 20px;
        }
        h1 {
          font-size: 1.5rem;
          color: #333;
        }
        p {
          color: #666;
          margin: 10px 0 20px;
        }
        a {
          padding: 10px 20px;
          border: none;
          border-radius: 13px;
          background-color: rgba(44,70,218,0.646);
          color: #fff;
          font-weight: bold;
          cursor: pointer;
          width: 90%;
          text-decoration: none;
        }
        a:hover {
          background-color: rgba(77,97,210,0.458);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">ALVIAN UXIO - APIs</div>
        <h1>${title}<hr></h1>
        <p>${description}</p>
        <a href="${redirectURL}">Back to Home</a>
      </div>
    </body>
    </html>
  `;
}
// reset pass
app.get('/reset-password', (req, res) => {
  const { oobCode } = req.query;

  if (!oobCode) {
    return res.status(400).send(renderHTML('Invalid Request', 'No action code provided.', '/'));
  }

  // Render halaman reset password
  res.send(renderResetPasswordHTML(oobCode));
});

// Halaman reset password
function renderResetPasswordHTML(oobCode) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f4f4f9;
        }
        .container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          background: #fff;
          border-radius: 13px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          width: 80%;
          max-width: 500px; /* Maksimal lebar */
        }
        h1 {
          font-size: 1.5rem;
          color: #333;
          margin: 0;
        }
        p {
          color: #666;
          margin: 10px 0 20px;
        }
        input {
          padding: 10px;
          margin: 10px 0;
          width: 80%;
          border: 1px solid #ccc;
          border-radius: 13px;
          outline:none;
        }
                .logo {
          font-size: 2rem;
          font-weight: bold;
          color: rgba(77,97,210,0.458);
          margin-bottom: 20px;
        }
        button {
          padding: 10px 20px;
          border: none;
          border-radius: 13px;
          background-color: rgba(44,70,218,0.646);
          color: #fff;
          font-weight: bold;
          cursor: pointer;
          width: 90%;
        }
        button:hover {
          background-color: rgba(77,97,210,0.458);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class='logo'>ALVIAN UXIO - APIs</h1>
        <h3>Reset Password<hr></h3>

        <p>Please enter your new password:</p>
<form action="/update-password" method="GET">
  <input type="hidden" name="oobCode" value="${oobCode}"> <!-- Keep oobCode hidden -->
  <input type="password" name="newPassword" placeholder="New Password" required>
  <button type="submit">Reset Password</button>
</form>
      </div>
    </body>
    </html>
  `;
}
app.get('/', (req, res) => {
  const acceptHeader = req.headers.accept || '';

  if (acceptHeader.includes('application/json')) {
    res.json({
      status: 'success',
      message: 'Welcome to ALVIAN UXIO API',
      author: 'ALVIAN UXIO Inc.',
      description: 'API ini dirancang untuk mempermudah integrasi berbagai layanan digital dengan teknologi terkini.',
      links: {
        whatsapp_channel: 'https://whatsapp.com/channel/0029VaAQKcJEquiQVH2RM10U',
        documentation: '/docs'
      }
    });
  } else {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ALVIAN UXIO - API Portfolio</title>
  <style>
    :root {
      --bg-color: #0f172a;
      --text-color: #ffffff;
      --neon-color: #00bfff;
      --roundness: 20px;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    .container {
      text-align: center;
      padding: 20px;
      border-radius: 13px;
      background: #0b225a6a;
      box-shadow: 0px rgba(0, 191, 255, 0.5);
      width: 80%;
      max-width: 500px;
      border: 2px solid #093bb66a;
    }

    .title {
      font-size: 2rem;
      font-weight: bold;
      color: var(--neon-color);
      margin-bottom: 10px;
    }

    .subtitle {
      font-size: 1.2rem;
      margin-bottom: 20px;
    }

    .description {
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .btn {
      display: inline-block;
      margin: 10px;
      padding: 10px 20px;
      font-size: 1rem;
      color: white;
      background: #0b225a6a;
      border: 2px solid #093bb66a;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      width: 80%;
      font-weight: bold;
      box-shadow: 0px rgba(0, 191, 255, 0.7);
      transition: transform 0.2s;
    }

    .btn:hover {
      transform: scale(1.05);
    }

    footer {
      margin-top: 20px;
      font-size: 0.9rem;
      color: var(--text-color);
    }
  </style>
</head>
<body>
  <div class="container">
    <center><div class="logo">
      <img src="https://files.catbox.moe/r2c1pe.jpg" alt="Logo" style='width:50px;height:50px;border-radius:50px'>
    </div></center>
    <div class="title">ALVIAN UXIO - API</div>
    <div class="subtitle">WELCOME!</div>
    <div class="description">
      API ini dibuat oleh ALVIAN UXIO Inc.
      API ini dirancang untuk mempermudah integrasi berbagai layanan digital dengan teknologi terkini. Dikembangkan dengan fokus pada kecepatan, keandalan, dan keamanan, API ini mendukung berbagai kebutuhan seperti data scraping, komunikasi, dan pengelolaan sistem.
    </div>
    <a href="https://whatsapp.com/channel/0029VaAQKcJEquiQVH2RM10U" class="btn">Follow Saluran WhatsApp</a>
    <a href="/docs" class="btn">Documentation</a>
  </div>
  <footer>© 2024 ALVIAN UXIO Inc.</footer>
</body>
</html>`);
  }
});
app.get('/create/apikey', (req, res) => {
    const secret = req.query.secret;

    // Validasi secret
    if (secret === adminPassword) {
        res.sendFile(path.join(__dirname, 'create.html')); // Kirim file HTML jika secret benar
    } else {
        res.status(403).send(`
<!doctype html>
<html lang="en">
<head>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Website Error</title>
    <style>
        :root {
            --primary-color: #333;
            --secondary-color: #555;
            --background-color: #f9f9f9;
            --surface-color: #ffffff;
            --accent-color: #3a3a3a;
            --border-color: #e0e0e0;
            --border-radius: 12px;
            --shadow: 0px 4px 12px rgba(0, 0, 0, 0.05);
            --button-background: rgb(22, 17, 17);
            --button-color: #ffffff;
            --button-hover-background: #555;
        }

        body {
            font-family: 'Arial', sans-serif;
            background-color: var(--background-color);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .container {
            text-align: center;
            padding: 25px;
            background-color: var(--surface-color);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            width: 80%;
            max-width: 500px;
            border: 1px solid var(--border-color);
            transform: translateY(20px);
            opacity: 0;
            animation: slideIn 0.5s forwards ease-in-out;
            animation-delay: 0.2s;
        }

        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .error-code {
            font-size: 48px;
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 15px;
            animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
        }

        .error-message {
            font-size: 16px;
            color: var(--secondary-color);
            background-color: var(--background-color);
            padding: 15px;
            border-radius: var(--border-radius);
            border: 1px solid var(--border-color);
            margin-bottom: 20px;
            animation: floating 2s ease-in-out infinite;
        }

        .separator {
            height: 1px;
            background-color: var(--border-color);
            margin: 20px 0;
            border-radius: var(--border-radius);
            width: 100%;
            transform: translateY(10px);
            opacity: 0;
            animation: slideIn 0.5s forwards ease-in-out;
            animation-delay: 0.8s;
        }

        .footer {
            font-size: 14px;
            color: var(--secondary-color);
            transform: translateY(10px);
            opacity: 0;
            animation: slideIn 0.5s forwards ease-in-out;
            animation-delay: 1s;
        }

        .footer a {
            color: var(--accent-color);
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        @keyframes pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .button {
            background-color: var(--button-background);
            color: var(--button-color);
            border: none;
            border-radius: var(--border-radius);
            padding: 15px 0;
            font-size: 16px;
            margin: 4px 0;
            cursor: pointer;
            width: 100%;
            transition: background-color 0.3s ease;
            transform: translateY(10px);
            opacity: 0;
            animation: slideIn 1s forwards ease-in-out, pop 3s infinite;
        }

        .button:hover {
            background-color: var(--button-hover-background);
            transform: translateY(-5px) scale(1.05);
        }

        .button:active {
            transform: translateY(0);
            transition: transform 0.1s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">Unauthorized</div>
        <div class="error-message">Sorry, only admin or owner can access this.</div>
        <div class="separator"></div>
        <button class="button" onclick="window.location.href='https://api.alvianuxio.my.id'">Back to Dashboard</button>
        <button class="button" onclick="window.location.href='https://go.alvianuxio.my.id/contact'">Contact Us</button>
        <button class="button" onclick="window.location.href='https://go.alvianuxio.my.id/contact'">Buy API Key</button>
        <button class="button" onclick="window.location.href='https://go.alvianuxio.my.id/contact'">Free API Key</button>
        <div class="separator"></div>
        <div class="footer">
            &copy; 2024 <a href="https://alvianuxio.my.id" target="_blank">ALVIAN UXIO - APIs</a>.
        </div>
    </div>
</body>
</html>
  `);
    }
});

// pricing
app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'pricing.html')); // Mengarahkan ke create.html
});
  

// Route untuk menangani pembuatan API key baru


// otakudesu all
app.get('/api/otakudesu/search', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await otaksearch(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/otakudesu/episode', async (req, res) => {
  try {
    const { apikey, link } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!link) {
      return res.status(400).json({ error: 'Parameter "link" tidak ditemukan' });
    }
    const response = await otakepisode(link);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/otakudesu/detail', async (req, res) => {
  try {
    const { apikey, link } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!link) {
      return res.status(400).json({ error: 'Parameter "link" tidak ditemukan' });
    }
    const response = await otakdetail(link);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/otakudesu/dl', async (req, res) => {
  try {
    const { apikey, link } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!link) {
      return res.status(400).json({ error: 'Parameter "link" tidak ditemukan' });
    }
    const response = await otakdl(link);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// status
const appStartTime = Date.now();

app.get('/status', async (req, res) => {
  const os = require('os');
  const cpus = os.cpus();

  // Mendapatkan informasi uptime server berdasarkan waktu aplikasi dijalankan
  const uptimeInSeconds = Math.floor((Date.now() - appStartTime) / 1000);
  const uptime = `${Math.floor(uptimeInSeconds / 3600)} hours ${Math.floor((uptimeInSeconds % 3600) / 60)} minutes`;

  // Mendapatkan informasi memori (RAM)
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

  const memoryInfo = {
    total: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`,
    used: `${(usedMemory / 1024 / 1024).toFixed(2)} MB`,
    usagePercentage: `${memoryUsagePercent} %`,
  };

  // Menyiapkan informasi sistem
  const status = {
    hostname: "alvianuxio",
    platform: os.platform(),
    osType: os.type(),
    cpuModel: cpus[0].model, // Model CPU
    cpuCores: cpus.length, // Jumlah core CPU
    memory: memoryInfo,
    uptime: uptime,
  };

  try {
    // Mendapatkan total requests dari Firebase
    const requestRef = ref(database, 'requests/count');
    const requestSnapshot = await get(requestRef);
    const totalRequests = requestSnapshot.exists() ? requestSnapshot.val() : 0;

    // Mendapatkan total visitor dari Firebase
    const visitorRef = ref(database, 'visitor/count');
    const visitorSnapshot = await get(visitorRef);
    const totalVisitor = visitorSnapshot.exists() ? visitorSnapshot.val() : 0;

    // Mendapatkan total user dari Firebase
    const usersRef = ref(database, 'users/');
    const usersSnapshot = await get(usersRef);
    const totalUsers = usersSnapshot.exists() ? Object.keys(usersSnapshot.val()).length : 0;

    // Mendapatkan total API keys dari Firebase
    const apiKeysRef = ref(database, 'apiKeys/');
    const apiKeysSnapshot = await get(apiKeysRef);
    const totalApiKeys = apiKeysSnapshot.exists() ? Object.keys(apiKeysSnapshot.val()).length : 0;

    // Menambahkan informasi ke status
    status.totalRequests = totalRequests;
    status.totalVisitor = totalVisitor;
    status.totalUsers = totalUsers;
    status.totalApiKeys = totalApiKeys;

    res.json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch data',
      error: error.message,
    });
  }
});
//GPT logic
app.get('/api/gptlogic', async (req, res) => {
  try {
    const { apikey, prompt, text } = req.query;

    if (!text || !prompt || !apikey) {
      return res.status(400).json({ error: 'Parameters "text" or "prompt" or "apikey" not found' });
    }
    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    const response = await gptlogic(text, prompt);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// translate js
app.get('/api/translate', async (req, res) => {
  try {
    const { apikey, lang, text } = req.query;

    if (!text || !lang || !apikey) {
      return res.status(400).json({ error: 'Parameters "text" or "lang" or "apikey" not found' });
    }
    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    const response = await translate(text, lang);
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// chat sandbox
app.get('/api/chatsandbox', async (req, res) => {
  try {
    const { apikey, model, text } = req.query;

    if (!text || !model || !apikey) {
      return res.status(400).json({ error: 'Parameters "text" or "model" or "apikey" not found' });
    }
    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    const response = await chatbot(text, model);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//Rusdi
app.get('/api/Rusdi', async (req, res) => {
  try {
    const { apikey, message } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await Rusdi(message);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// reset limit

const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'bbcb123c@gmail.com', pass: 'hssc htgp mest jvsx' } });

app.get('/admin/limit/reset', async (req, res) => { try { const { password } = req.query;

if (!password || password !== adminPassword) {
  return res.status(403).json({ error: 'Access denied. Incorrect password.' });
}

const apiKeysRef = ref(database, 'apiKeys');
const snapshot = await get(apiKeysRef);
if (!snapshot.exists()) {
  return res.status(404).json({ error: 'No API keys found.' });
}

const updates = {};
const emailRecipients = [];

snapshot.forEach((childSnapshot) => {
  const key = childSnapshot.key;
  const data = childSnapshot.val();

  if (key.startsWith('au-') && data.limit === 200) {
    updates[`apiKeys/${key}/usage`] = 0;
    if (data.email) {
      emailRecipients.push(data.email);
    }
  }
});

if (Object.keys(updates).length === 0) {
  return res.status(200).json({ status: 'No API keys matched the criteria.' });
}

await update(ref(database), updates);

// Kirim email ke semua pengguna yang memenuhi kriteria
if (emailRecipients.length > 0) {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: emailRecipients.join(','),
    subject: 'API Key Usage Reset',
    text: 'Your API key usage has been reset to 0.'
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

res.status(200).json({
  status: 'Usage reset successfully for matching API keys!',
  updatedKeys: Object.keys(updates),
});

} catch (error) { console.error('Error resetting usage:', error); res.status(500).json({ error: error.message }); } });

// change apikey
app.get('/admin/change', async (req, res) => {
  res.send('Use POST method to change API keys.');
});
app.post('/admin/change', async (req, res) => {
  try {
    const { oldKey, newKey, password } = req.query;

    // Check admin password
    if (!password || password !== adminPassword) {
      return res.status(403).json({ error: 'Access denied. Incorrect password.' });
    }

    // Validate keys
    if (!oldKey || !newKey) {
      return res.status(400).json({ error: 'Both "oldKey" and "newKey" are required.' });
    }

    // Reference to the old API key in Firebase
    const oldKeyRef = ref(database, `apiKeys/${oldKey}`);
    const snapshot = await get(oldKeyRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Old API key not found.' });
    }

    const apiKeyData = snapshot.val();

    // Check if the API key is premium
    if (!apiKeyData.premium) {
      return res.status(403).json({ error: 'API key is not premium.' });
    }

    // Check if the new key already exists
    const newKeyRef = ref(database, `apiKeys/${newKey}`);
    const newKeySnapshot = await get(newKeyRef);
    if (newKeySnapshot.exists()) {
      return res.status(400).json({ error: 'New API key already exists.' });
    }

    // Update the key (move data to new key)
    apiKeyData.key = newKey; // Optionally update the key field if you store it
    await set(newKeyRef, apiKeyData);
    await remove(oldKeyRef); // Remove the old key

    res.status(200).json({
      status: 'API key changed successfully!',
      oldKey: oldKey,
      newKey: newKey,
      data: apiKeyData,
    });
  } catch (error) {
    console.error('Error renaming API key:', error);
    res.status(500).json({ error: error.message });
  }
});
// create apikey
app.get('/admin/create', async (req, res) => {
  try {
    const { create, password, limit, premium, expired } = req.query;

    // Check if password is correct
    if (!password || password !== adminPassword) {
      return res.status(403).json({ error: 'Access denied. Incorrect password.' });
    }

    // Validate create parameter
    if (!create) {
      return res.status(400).json({ error: 'Parameter "create" not found.' });
    }

    // Validate and parse expired date
    let expiredTimestamp;
    if (expired) {
      if (isValidDate(expired)) {
        expiredTimestamp = convertToTimestamp(expired); // Add 23:59:00 automatically
      } else {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }
    } else {
      // Set default expiration to 30 days from now
      expiredTimestamp = Date.now() + (30 * 24 * 60 * 60 * 1000);
    }

    // Prepare API key details
const apiKeyDetails = {
  key: create,
  limit: limit ? parseInt(limit) : 3500,
  premium: premium === "true",
  expired: new Date(expiredTimestamp).toISOString(),
  usage: 0, // Initialize usage to 0
};

    // Reference to the API key in Firebase
    const apiKeyRef = ref(database, `apiKeys/${create}`);

    // Save API key to Firebase
    await set(apiKeyRef, apiKeyDetails);

    res.status(200).json({
      status: 'API key created successfully!',
      data: apiKeyDetails,
    });
  } catch (error) {
    console.error("Error creating API key:", error); // Log the error
    res.status(500).json({ error: error.message });
  }
});

// Function to validate date format (YYYY-MM-DD)
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/; // Match YYYY-MM-DD format
  return regex.test(dateString);
}

// Function to convert date to timestamp with default time 23:59:00
function convertToTimestamp(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 0).getTime(); // Add 23:59:00
}

app.get('/apikey/suspend', async (req, res) => {
  try {
    const { apikey, password } = req.query;

    // Check if password is correct
    if (!password || password !== adminPassword) {
      return res.status(403).json({ error: 'Access denied. Incorrect password.' });
    }

    // Validate apikey parameter
    if (!apikey) {
      return res.status(400).json({ error: 'API key parameter "apikey" not found.' });
    }

    // Reference to the API key in Firebase
    const apiKeyRef = ref(database, `apiKeys/${apikey}`);

    // Check if the API key exists
    const apiKeySnapshot = await get(apiKeyRef);
    if (!apiKeySnapshot.exists()) {
      return res.status(404).json({ error: 'API key not found.' });
    }

    // Update API key status to suspended
    await update(apiKeyRef, { status: 'suspended' });

    res.status(200).json({
      status: 'API key suspended successfully!',
      apikey: apikey,
    });
  } catch (error) {
    console.error("Error suspending API key:", error); // Log the error
    res.status(500).json({ error: error.message });
  }
});

// check apikey
app.get('/apikey/check', async (req, res) => {
  try {
    const { apiKey } = req.query;

    // Check if apiKey parameter is present
    if (!apiKey) {
      return res.status(400).json({ error: 'Parameter "apiKey" not found.' });
    }

    // Reference to the API key in Firebase
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `apiKeys/${apiKey}`));

    // If the API key is not found
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'API key not found.' });
    }

    const apiKeyDetails = snapshot.val();

    // Check if the API key is suspended
    if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    // Check if the expired field is valid
    if (!apiKeyDetails.expired) {
      return res.status(400).json({ error: 'Expiration date is missing for this API key.' });
    }

    const expirationDate = new Date(apiKeyDetails.expired); // Convert to Date object
    const currentDate = new Date(); // Get the current date

    // Check if the API key is expired
    const isExpired = expirationDate.getTime() < currentDate.getTime();

    // Include usage and limit in the response
    const usageDetails = {
      usage: apiKeyDetails.usage || 0, // Default to 0 if not set
      limit: apiKeyDetails.limit || 0, // Default to 0 if not set
      remaining: (apiKeyDetails.limit || 0) - (apiKeyDetails.usage || 0), // Calculate remaining usage
    };

    res.status(isExpired ? 403 : 200).json({
      status: isExpired ? "403" : "200",
      info: isExpired ? 'API key has expired.' : 'API key is valid.',
      data: isExpired ? null : {
        key: apiKeyDetails.key,
        limit: apiKeyDetails.limit,
        usage: usageDetails.usage, // Prevent negative remaining
        premium: apiKeyDetails.premium,
        expired: apiKeyDetails.expired,
      },
    });
  } catch (error) {
    console.error("Error checking API key:", error); // Log the error
    res.status(500).json({ error: error.message });
  }
});
// brat
app.get("/api/brat", async (req, res) => { 
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await axios.get(`https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', 'image/png');
    res.send(response.data);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message })
  }
})


// tt stalk
app.get("/api/stalk/tiktok", async (req, res) => {
  try {
    const { apikey, username } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    // Validasi parameter username
    if (!username) {
      return res.status(400).json({ error: 'Parameter "username" tidak ditemukan' });
    }

    // Panggil API eksternal untuk mendapatkan data TikTok
    const response = await axios.get(`https://api.siputzx.my.id/api/stalk/tiktok?username=${encodeURIComponent(username)}`);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });

    // Periksa apakah respons memiliki status true dan data
    if (response.data && response.data.status && response.data.data) {
      res.status(200).json(response.data);
    } else {
      res.status(404).json({ error: 'Data TikTok tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});
// uploader api

// tts
app.get("/api/tts", async (req, res) => { 
  try {
    const { apikey, text } = req.query;

    if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }

    if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }

    // Ambil audio dari API TTS
    const ttsResponse = await axios.get(`https://api.siputzx.my.id/api/tools/tts?text=${encodeURIComponent(text)}&voice=jv-ID-DimasNeural&rate=0%&pitch=0Hz&volume=0%`, {
      responseType: 'arraybuffer'
    });

    // Upload ke Catbox
    const fileUrl = await Uploader.catbox(ttsResponse.data, "tts.mp3");

    // Perbarui penggunaan API
    const updatedUsage = (apiKeyDetails.usage || 0) + 1;
    await update(apiKeRef, { usage: updatedUsage });

    // Mengembalikan hasil dalam format JSON
    res.json({
      status: true,
      message: "TTS generated successfully",
      url: fileUrl
    });

  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});
//gemini
app.get('/api/gemini', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await gemini(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// mistral
app.get('/api/mistral', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await mistralNemo.chat(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// deepseek
app.get('/api/deepseek', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await deepSeekCoder.chat(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// flux
app.get('/api/flux', async (req, res) => {
  try {
    const { apikey, prompt } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Parameter "prompt" tidak ditemukan' });
    }
    const response = await freeflux.create(prompt);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Brat 
app.get('/api/Brat', async (req, res) => {
  try {
    const { apikey, message } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await Brat(message);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//halodoc
app.get('/api/halodoc', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await halodoc(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// yahoo
app.get('/api/yahoo', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await yahoo(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// jadwal tv
app.get('/api/jadwal-tv', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await jdtv(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//bingsearch
app.get('/api/bing/search', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await bingsearch(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/bing/image', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await bingimg(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// bing vid
app.get('/api/bing/video', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await bingvid(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//gptpic
app.get('/api/gptpic', async (req, res) => {
  try {
    const { apikey, message } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await gptpic(message);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//prodia
app.get('/api/prodia', async (req, res) => {
  try {
    const { apikey, message } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await prodia(message);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// txt2img
app.get('/api/txt2img', async (req, res) => {
  try {
    const { apikey, prompt } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Parameter "prompt" tidak ditemukan' });
    }
    const response = await txt2img(prompt);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// txt2img v2
app.get('/api/txt2img/v2', async (req, res) => {
  try {
    const { apikey, prompt } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await txt2imgv2(prompt);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//pinterest
app.get('/api/pinterest', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await pinterest(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// sound cloud
app.get('/api/soundcloud', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await scs(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// wikipedia
app.get('/api/wikipedia', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await wiki(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Dafont
app.get('/api/dafont', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await sfont(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// pinterest 2
app.get('/api/pinterest/v2', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await pin2(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// uhd wallpaper
app.get('/api/uhd-wallpaper', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await uphd(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// bukalapak
app.get('/api/bukalapak', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await bukaSearch(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// steam search
app.get('/api/steam-search', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await Steam(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//gsmarena
app.get('/api/gsmarena', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await gsm(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//igdl
app.get('/api/instagram', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await igdl(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// stickerly
app.get('/api/stickerly', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await dlly(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// tinyurl
app.get('/api/tinyurl', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await tiny(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//yt-search 
app.get('/api/yt-search', async (req, res) => {
  try {
    const { apikey, query } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!query) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await youtubes(query);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// play
app.get('/api/play', async (req, res) => {
  try {
    const { apikey, query, format } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!query) {
      return res.status(400).json({ error: 'Parameter "query" tidak ditemukan' });
    }
    if (!format) {
      return res.status(400).json({ error: 'Parameter "format" tidak ditemukan' });
    }
    const response = await play(query, format);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//instagram 2
app.get('/api/instagram/v2', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await instadl(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//remini
app.get('/api/remini', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await remini(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//hdimg
app.get('/api/hdr', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await hdimg(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/removebg', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await removebg(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// spotify
app.get('/api/spotify', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await spotifydl(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// idntimes
// spotify
app.get('/api/idntimes', async (req, res) => {
  try {
    const { apikey, message } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await idn(message);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// capcut
app.get('/api/capcut', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await capcut(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// mediafire
app.get('/api/mediafire/old', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await mf(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// mf 2
app.get('/api/mediafire', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await mf2(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// krakenfiles
app.get('/api/krakenfiles', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await krakenfiles(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// facebook
app.get('/api/facebook', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await fb(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// terabox
app.get('/api/terabox', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await terabox(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// terabox v2
app.get('/api/terabox/v2', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await teradlx(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ssweb
app.get('/api/ssweb', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await ssweb(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// check ip
app.get('/api/check-ip', async (req, res) => {
  try {
    const { apikey } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    const response = await checkip();
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// quotes
app.get('/api/quotes', async (req, res) => {
  try {
    const { apikey } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }

    const response = await quotes();
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// track ip
app.get('/api/track-ip', async (req, res) => {
  try {
    const { apikey, ip } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!ip) {
      return res.status(400).json({ error: 'Parameter "ip" tidak ditemukan' });
    }

    const response = await getIPInfo(ip);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// tiktok
app.get('/api/tiktok', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await tiktok3(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//tiktok 3
app.get('/api/tiktok3', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await tiktok(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// tiktok2
app.get('/api/tiktok/v2', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await ttsave.video(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// tt stalk
app.get('/api/tiktok/stalk', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await tiktokStalk(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// twitter
app.get('/api/twitter', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await twiterdl(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//gpt4o
app.get('/api/gpt4o', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await gpt4o(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//llama
app.get('/api/llama3', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await llama(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//openai
app.get('/api/openai', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await openai(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// videy
app.get('/api/videy', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!apiKeyDetails.premium) {
      return res.status(403).json({ 
        error: 'Fitur ini hanya tersedia untuk user premium', 
        info: 'Silakan upgrade ke paket premium untuk mengakses fitur ini' 
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await videy(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// gdrive
app.get('/api/gdrive', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await GDriveDl(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// igstalk
app.get('/api/igstalk', async (req, res) => {
  try {
    const { apikey, search } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!search) {
      return res.status(400).json({ error: 'Parameter "search" tidak ditemukan' });
    }
    const response = await igstalk(search);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//aio
app.get('/api/aio', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await aio(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// aio v2
app.get('/api/aio/v2', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await aio2(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// youtube
app.get('/api/ytdl', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await yt(url);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//ytmp3
app.get('/api/ytmp3', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await newyt(url, "mp3");
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//ytmp4
app.get('/api/ytmp4', async (req, res) => {
  try {
    const { apikey, url } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!url) {
      return res.status(400).json({ error: 'Parameter "url" tidak ditemukan' });
    }
    const response = await newyt(url, "mp4");
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//letmeGPT
app.get('/api/letmegpt', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await letmegpt(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/gpt-turbo', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!apiKeyDetails.premium) {
      return res.status(403).json({ 
        error: 'Fitur ini hanya tersedia untuk user premium', 
        info: 'Silakan upgrade ke paket premium untuk mengakses fitur ini' 
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await gptturbo(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//simi
app.get('/api/simi', async (req, res) => {
  try {
    const { apikey, text }= req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await simi(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Endpoint untuk ragBot
app.get('/api/ragbot', async (req, res) => {
  try {
    const { apikey, message } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await ragBot(message);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk degreeGuru
app.get('/api/degreeguru', async (req, res) => {
  try {
    const { apikey, text }= req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await degreeGuru(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk Renvy AI
app.get('/api/Renvy', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await Renvy(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//simi
app.get('/api/aluxi', async (req, res) => {
  try {
    const { apikey, message }= req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!message) {
      return res.status(400).json({ error: 'Parameter "message" tidak ditemukan' });
    }
    const response = await simi(message);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk smartContract
app.get('/api/smartcontract', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    const response = await smartContract(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// luminai
app.get('/api/luminai', async (req, res) => {
  try {
    const { apikey, text, prompt } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Parameter "prompt" tidak ditemukan' });
    }
    const response = await luminai(text, prompt);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Endpoint untuk blackboxAIChat
app.get('/api/blackbox', async (req, res) => {
  try {
    const { apikey, text } = req.query;
if (!apikey) {
      return res.status(400).json({ 
        error: 'Parameter "apikey" tidak ditemukan', 
        info: 'Sertakan API key dalam permintaan Anda' 
      });
    }

    // Referensi ke API key di Firebase
    const apiKeRef = ref(database, `apiKeys/${apikey}`);
const dbRef = ref(database);// `database` adalah instance Firebase Database
    const snapshot = await get(child(dbRef, `apiKeys/${apikey}`));

    // Jika API key tidak ditemukan
    if (!snapshot.exists()) {
      return res.status(403).json({ 
        error: 'Apikey tidak valid atau tidak ditemukan', 
        info: 'Pastikan API key Anda benar atau aktif' 
      });
    }

    const apiKeyDetails = snapshot.val();

    // Validasi batas penggunaan
    if (apiKeyDetails.usage >= apiKeyDetails.limit) {
      return res.status(403).json({ 
        error: 'API usage limit has been reached', 
        info: `Maximum limit: ${apiKeyDetails.limit}, current usage: ${apiKeyDetails.usage}` 
      });
    }
if (apiKeyDetails.status === 'suspended') {
      return res.status(403).json({
        error: 'API key has been suspended.',
        info: 'The API key you are using has been suspended and cannot be used.'
      });
    }
    if (!text) {
      return res.status(400).json({ error: 'Parameter "text" tidak ditemukan' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Parameter "prompt" tidak ditemukan' });
    }
    const response = await blackbox(text);
    const currentUsage = apiKeyDetails.usage || 0; // Inisialisasi ke 0 jika undefined
    const updatedUsage = currentUsage + 1;
await trackTotalRequest();

    // Perbarui usage di Firebase
    await update(apiKeRef, { usage: updatedUsage });
    res.status(200).json({
  information: `https://go.alvianuxio.my.id/contact`,
  creator: "ALVIAN UXIO Inc",
  data: {
    response: response
  }
});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle 404 error
app.use((req, res, next) => {
  // Ambil parameter path setelah '/'
  const path = req.originalUrl;

  // Kirim respons 404 dengan path
  res.status(404).send(`
<!doctype html>
<html lang="en">
<head>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Website Error</title>
    <style>
        :root {
            --primary-color: #333;
            --secondary-color: #555;
            --background-color: #f9f9f9;
            --surface-color: #ffffff;
            --accent-color: #3a3a3a;
            --border-color: #e0e0e0;
            --border-radius: 12px;
            --shadow: 0px 4px 12px rgba(0, 0, 0, 0.05);
            --button-background: rgb(22, 17, 17);
            --button-color: #ffffff;
            --button-hover-background: #555;
        }

        body {
            font-family: 'Arial', sans-serif;
            background-color: var(--background-color);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .container {
            text-align: center;
            padding: 25px;
            background-color: var(--surface-color);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            width: 80%;
            max-width: 500px;
            border: 1px solid var(--border-color);
            transform: translateY(20px);
            opacity: 0;
            animation: slideIn 0.5s forwards ease-in-out;
            animation-delay: 0.2s;
        }

        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .error-code {
            font-size: 48px;
            font-weight: bold;
            color: var(--accent-color);
            margin-bottom: 15px;
            animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
        }

        .error-message {
            font-size: 16px;
            color: var(--secondary-color);
            background-color: var(--background-color);
            padding: 15px;
            border-radius: var(--border-radius);
            border: 1px solid var(--border-color);
            margin-bottom: 20px;
            animation: floating 2s ease-in-out infinite;
        }

        .separator {
            height: 1px;
            background-color: var(--border-color);
            margin: 20px 0;
            border-radius: var(--border-radius);
            width: 100%;
            transform: translateY(10px);
            opacity: 0;
            animation: slideIn 0.5s forwards ease-in-out;
            animation-delay: 0.8s;
        }

        .footer {
            font-size: 14px;
            color: var(--secondary-color);
            transform: translateY(10px);
            opacity: 0;
            animation: slideIn 0.5s forwards ease-in-out;
            animation-delay: 1s;
        }

        .footer a {
            color: var(--accent-color);
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        @keyframes pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .button {
            background-color: var(--button-background);
            color: var(--button-color);
            border: none;
            border-radius: var(--border-radius);
            padding: 15px 0;
            font-size: 16px;
            margin: 4px 0;
            cursor: pointer;
            width: 100%;
            transition: background-color 0.3s ease;
            transform: translateY(10px);
            opacity: 0;
            animation: slideIn 1s forwards ease-in-out, pop 3s infinite;
        }

        .button:hover {
            background-color: var(--button-hover-background);
            transform: translateY(-5px) scale(1.05);
        }

        .button:active {
            transform: translateY(0);
            transition: transform 0.1s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">404</div>
        <div class="error-message">Cannot GET ${path}</div>
        <div class="separator"></div>
        <button class="button" onclick="window.location.href='https://api.alvianuxio.my.id'">Back to Dashboard</button>
        <button class="button" onclick="window.location.href='https://go.alvianuxio.my.id/contact'">Contact Us</button>
        <button class="button" onclick="window.location.href='https://go.alvianuxio.my.id/contact'">Buy API Key</button>
        <button class="button" onclick="window.location.href='https://go.alvianuxio.my.id/contact'">Free API Key</button>
        <div class="separator"></div>
        <div class="footer">
            &copy; 2024 <a href="https://alvianuxio.my.id" target="_blank">ALVIAN UXIO - APIs</a>.
        </div>
    </div>
</body>
</html>
  `);
});

// Handle error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app
