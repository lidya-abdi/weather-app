let valueSearch = document.getElementById("valueSearch");
let city = document.getElementById("city");
let temperature = document.getElementById("temperature");
let description = document.querySelector(".description");
let clouds = document.getElementById("clouds");
let humidity = document.getElementById("humidity");
let pressure = document.getElementById("pressure");
let form = document.querySelector("form");
let main = document.querySelector("main");
const geoBtn = document.getElementById('geo-btn');


let id = "9505fd1df737e20152fbd78cdb289b6a"
let url = "https://api.openweathermap.org/data/2.5/weather?units=metric&appid=" + id;
let forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?units=metric&appid=" + id;
const forecastListEl = document.getElementById('forecastList');

function updateDaylight(sunrise, sunset, nowSec){
  // نحسب نسبة التقدّم بين الشروق والغروب
  const start = Number(sunrise);
  const end   = Number(sunset);
  const now   = Number(nowSec) || Math.floor(Date.now()/1000);

  // لو لسه قبل الشروق/بعد الغروب نقيّد النسبة 0..1
  const progress = Math.max(0, Math.min(1, (now - start) / (end - start)));

  // نصف دائرة: من 180° (يسار) إلى 0° (يمين)
  const theta = Math.PI * (1 - progress);

  // نفس أبعاد الـSVG
  const r  = 110;
  const cx = 130;
  const cy = 120;

  const x = cx + r * Math.cos(theta);
  const y = cy - r * Math.sin(theta);

  const dot = document.getElementById('sunDot');
  if (dot){
    dot.setAttribute('cx', x.toFixed(1));
    dot.setAttribute('cy', y.toFixed(1));
  }

  // تعبئة الشروق/الغروب (بتوقيت جهاز المستخدم)
  const fmt = { hour: '2-digit', minute: '2-digit' };
  const sr = new Date(start * 1000).toLocaleTimeString([], fmt);
  const ss = new Date(end   * 1000).toLocaleTimeString([], fmt);

  const srEl = document.getElementById('sunrise');
  const ssEl = document.getElementById('sunset');
  if (srEl) srEl.textContent = sr;
  if (ssEl) ssEl.textContent = ss;
}


// يحوّل قائمة 3 ساعات إلى 5 أيام مرتبة
function buildDailyForecast(list){
  const byDate = {};
  list.forEach(item => {
    const date = item.dt_txt.slice(0,10); // YYYY-MM-DD
    const min = item.main.temp_min;
    const max = item.main.temp_max;
    if(!byDate[date]){
      byDate[date] = { min, max, icon: item.weather[0].icon };
    } else {
      byDate[date].min = Math.min(byDate[date].min, min);
      byDate[date].max = Math.max(byDate[date].max, max);
      // نفضّل أيقونة الساعة 12:00 لو موجودة
      if(item.dt_txt.includes('12:00:00')){
        byDate[date].icon = item.weather[0].icon;
      }
    }
  });

  // رُتّبي التواريخ ثم خذي أول 5
  return Object.keys(byDate).sort().slice(0,5).map(date => {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    return {
      date,
      day: dayName,
      icon: byDate[date].icon,
      min: Math.round(byDate[date].min),
      max: Math.round(byDate[date].max),
    };
  });
}

function renderForecast(days){
  if(!forecastListEl) return;
  forecastListEl.innerHTML = '';
  days.forEach(d => {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="day-name">${d.day}</div>
      <img src="https://openweathermap.org/img/wn/${d.icon}@2x.png" alt="" loading="lazy">
      <div class="temps">
        <span class="hi">${d.max}°</span>
        <span class="lo">${d.min}°</span>
      </div>
    `;
    forecastListEl.appendChild(card);
  });
}



form.addEventListener("submit", (e) => {
    e.preventDefault();
    // التحقق من صحة الإدخال اذا كان أقل من حرفين مافي داعي نعمل fetch
    const query = valueSearch.value.trim();
    if (query.length < 2) {
        main.classList.add('error');
        setTimeout(() => main.classList.remove('error'), 1000);
        return;     // ما نعمل fetch إذا الإدخال غير صالح
    }

    searchWeather();
});

// click handler for geolocation
geoBtn.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    main.classList.add('error');
    setTimeout(() => main.classList.remove('error'), 1000);
    return;
  }

  const opts = { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 };

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      searchWeatherByCoords(latitude, longitude);
    },
    () => {
      // permission denied / timeout
      main.classList.add('error');
      setTimeout(() => main.classList.remove('error'), 1000);
    },
    opts
  );
});



const searchWeather = () => {
    fetch(url + "&q=" + valueSearch.value)
    .then(responsive => responsive.json())
    .then(data => {
        console.log(data);
        if(data.cod == 200){
            city.querySelector("figcaption").innerText = data.name;
            city.querySelector("img").src = "https://flagsapi.com/"+data.sys.country+"/shiny/32.png";

            temperature.querySelector("img").src = "https://openweathermap.org/img/wn/"+data.weather[0].icon+"@4x.png";
            temperature.querySelector("figcaption span").innerText = data.main.temp;
            description.innerText = data.weather[0].description;
            clouds.innerText = data.clouds.all;
            humidity.innerText = data.main.humidity;
            pressure.innerText = data.main.pressure;
            fetchForecastByCity(data.name);
            updateDaylight(data.sys.sunrise, data.sys.sunset, data.dt);


        }else{
            //false
            main.classList.add("error");
            setTimeout(() => {
                main.classList.remove("error");
            }, 1000);
        }

        valueSearch.value = "";
    })
    .catch(() => {
      main.classList.add("error");
      setTimeout(() => main.classList.remove("error"), 1000);
    })
};

//  fetch by coordinates (lat/lon)
const searchWeatherByCoords = (lat, lon) => {
  fetch(`${url}&lat=${lat}&lon=${lon}`)
    .then(res => res.json())
    .then(data => {
      if (data.cod == 200) {
        city.querySelector("figcaption").innerText = data.name;
        city.querySelector("img").src = `https://flagsapi.com/${data.sys.country}/shiny/32.png`;

        temperature.querySelector("img").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
        const t = Math.round(data.main.temp);
        temperature.querySelector("figcaption span").innerText = t; 
        description.innerText = data.weather[0].description;
        clouds.innerText = data.clouds.all;
        humidity.innerText = data.main.humidity;
        pressure.innerText = data.main.pressure;
        fetchForecastByCoords(lat, lon);
        updateDaylight(data.sys.sunrise, data.sys.sunset, data.dt);


      } else {
        // city not found
        main.classList.add("error");
        setTimeout(() => main.classList.remove("error"), 1000);
      }
    })
    .catch(() => {
      // network error
      main.classList.add("error");
      setTimeout(() => main.classList.remove("error"), 1000);
    })
    .finally(() => {
      valueSearch.value = "";
    });
};


function fetchForecastByCity(name){
  fetch(forecastUrl + "&q=" + encodeURIComponent(name))
    .then(r => r.json())
    .then(data => {
      console.log('forecast city cod=', data.cod, data);
      if ((data.cod === 200 || data.cod === '200') && Array.isArray(data.list)) {
        const days = buildDailyForecast(data.list);
        console.log('days built:', days);
        renderForecast(days);
      } else {
        if (forecastListEl) forecastListEl.innerHTML = '';
      }
    })
    .catch(err => {
      console.error('forecast city error', err);
      if (forecastListEl) forecastListEl.innerHTML = '';
    });
}

function fetchForecastByCoords(lat, lon){
  fetch(`${forecastUrl}&lat=${lat}&lon=${lon}`)
    .then(r => r.json())
    .then(data => {
      console.log('forecast coords cod=', data.cod, data);
      if ((data.cod === 200 || data.cod === '200') && Array.isArray(data.list)) {
        const days = buildDailyForecast(data.list);
        renderForecast(days);
      } else {
        if (forecastListEl) forecastListEl.innerHTML = '';
      }
    })
    .catch(err => {
      console.error('forecast coords error', err);
      if (forecastListEl) forecastListEl.innerHTML = '';
    });
}



const initApp = () => {
    valueSearch.value = "Turkey";
    searchWeather();
};
initApp();