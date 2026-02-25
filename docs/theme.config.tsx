import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>Agentbase Docs</span>,
  project: {
    link: "https://github.com/AgentaFlow/agentbase",
  },
  docsRepositoryBase: "https://github.com/AgentaFlow/agentbase/tree/main/docs",
  footer: {
    text: (
      <span>
        © Agentbase — Easily Publish Your AI Applications, produced by{" "}
        <a
          href="https://www.agentaflow.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}
        >
          AgentaFlow
        </a>
      </span>
    ),
  },
  useNextSeoProps() {
    return { titleTemplate: "%s – Agentbase Docs" };
  },
};

export default config;
