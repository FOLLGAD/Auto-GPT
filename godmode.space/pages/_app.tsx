import * as React from "react";
import {
  ChakraProvider,
  Box,
  extendTheme,
  ThemeConfig,
  ColorModeScript,
} from "@chakra-ui/react";
import { ISettings } from "../src/Agent";
import SettingsModalContext from "../src/SettingsModalContext";
import LoginModal from "../src/LoginModal";
import { AppProps } from "next/app";
import Head from "next/head";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

// Check that PostHog is client-side (used to handle Next.js SSR)
if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com",
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

console.log("Any thoughts or questions, reach out to @emilahlback on Twitter");

const config: ThemeConfig = {
  useSystemColorMode: false,
  initialColorMode: "dark",
};
// 3. extend the theme
const customTheme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: "#0A081E",
      },
    },
  },
});

const App: React.FC<AppProps> = ({ Component, pageProps }) => {
  const [settings, setSettings] = React.useState({
    openAIKey: null,
    mustSetKey: false,
    gptModel: "gpt-3.5-turbo",
  } as ISettings);

  // Fix for nextjs
  React.useEffect(() => {
    setSettings((settings) => ({
      ...settings,
      openAIKey: localStorage.getItem("openAIKey") || null,
    }));
  }, []);

  React.useEffect(() => {
    try {
      posthog.register({
        hasApiKey: !!settings.openAIKey,
      });
    } catch (e) {
      /* empty */
    }
  }, [settings.openAIKey]);

  const [showSettings, setShowSettings] = React.useState(false);
  const [sessionLoading, setSessionLoading] = React.useState(false);

  return (
    <ChakraProvider theme={customTheme}>
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content="Explore the Power of Generative AI Agents on Godmode. Inspired by Auto-GPT and BabyAGI. Supports GPT-3.5 & GPT-4."
        />
        <meta name="keywords" content="Godmode, AI, LLM, Agents" />
        <link rel="canonical" href="https://godmode.space/" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />

        <meta property="og:title" content="Godmode AI" />
        <meta
          property="og:description"
          content="Explore the Power of Generative AI Agents on Godmode."
        />
        <meta
          property="og:image"
          content="https://godmode.space/godmode-hero.png"
        />
        <meta property="og:image:width" content="1005" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Godmode AI" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://godmode.space/" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(-359deg); }
          }
        `,
          }}
        ></style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:3448504,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`,
          }}
        ></script>
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-6NR5XNHL5B"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-6NR5XNHL5B');
            `,
          }}
        ></script>
      </Head>
      <ColorModeScript initialColorMode={"dark"} />
      <SettingsModalContext.Provider
        value={{
          setSettings,
          settings,
          setShowSettings,
          sessionLoading,
          setSessionLoading,
        }}
      >
        <LoginModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <PostHogProvider client={posthog}>
          <Box bg="#0A081E">
            <Component {...pageProps} />
          </Box>
        </PostHogProvider>
      </SettingsModalContext.Provider>
    </ChakraProvider>
  );
};

export default App;
