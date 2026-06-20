'use client';

import Script from 'next/script';
import { useCookieConsent } from './CookieConsentContext';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const UET_ID = process.env.NEXT_PUBLIC_MS_UET_TAG_ID;

export function Analytics() {
  const { consent } = useCookieConsent();

  if (consent !== 'accepted') return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}

      {UET_ID && (
        <>
          <Script id="uet-init" strategy="afterInteractive">
            {`
              (function(w,d,t,r,u){
                var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${UET_ID}"};
                o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},
                n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){
                  var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)
                },i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)
              })(window,document,"script","//bat.bing.com/bat.js","uetq");
            `}
          </Script>
        </>
      )}
    </>
  );
}
