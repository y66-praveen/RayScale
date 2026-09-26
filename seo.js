(function(){
  var BASE='https://rayscale.netlify.app';
  var path=location.pathname.replace(/index\.html$/,'')||'/';
  var canonical=BASE+(path==='/'? '' : path);

  function setMeta(attr,key,content){
    if(!content) return;
    var el=document.querySelector('meta['+attr+'="'+key+'"]');
    if(!el){ el=document.createElement('meta'); el.setAttribute(attr,key); document.head.appendChild(el); }
    el.setAttribute('content',content);
  }
  function setLink(rel,href){
    var el=document.querySelector('link[rel="'+rel+'"]');
    if(!el){ el=document.createElement('link'); el.setAttribute('rel',rel); document.head.appendChild(el); }
    el.setAttribute('href',href);
  }

  var descEl=document.querySelector('meta[name="description"]');
  var desc=descEl?descEl.content:'Interactive ray optics simulator for reflection and refraction — mirrors, lenses and a glass slab, built for JEE, NEET and high-school physics.';
  var title=document.title;

  setLink('canonical',canonical);
  setMeta('property','og:url',canonical);
  setMeta('property','og:type','website');
  setMeta('property','og:site_name','Ray Scale');
  setMeta('property','og:title',title);
  setMeta('property','og:description',desc);
  setMeta('property','og:image',BASE+'/og-image.png');
  setMeta('property','og:image:width','1335');
  setMeta('property','og:image:height','577');
  setMeta('name','twitter:card','summary_large_image');
  setMeta('name','twitter:title',title);
  setMeta('name','twitter:description',desc);
  setMeta('name','twitter:image',BASE+'/og-image.png');
  setMeta('name','robots', document.querySelector('meta[name="robots"]') ? undefined : 'index, follow');

  var pageType = path.indexOf('reflection')>-1 ? 'Reflection Simulator'
    : path.indexOf('refraction')>-1 ? 'Refraction Simulator'
    : path.indexOf('about')>-1 ? 'About' : 'Home';

  if(path.indexOf('/404')===-1){
    var ld={
      "@context":"https://schema.org",
      "@type":"WebApplication",
      "name":"Ray Scale"+(pageType!=='Home' ? ' — '+pageType : ' — Ray Optics Simulator'),
      "url":canonical,
      "applicationCategory":"EducationApplication",
      "operatingSystem":"Any",
      "description":desc,
      "isAccessibleForFree":true,
      "author":{"@type":"Person","name":"y66.praveen","url":"https://www.instagram.com/y66.praveen/"},
      "creator":{"@type":"Person","name":"y66.prateek","url":"https://www.instagram.com/y66.prateek/"},
      "offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}
    };
    var s=document.createElement('script');
    s.type='application/ld+json';
    s.textContent=JSON.stringify(ld);
    document.head.appendChild(s);
  }
})();