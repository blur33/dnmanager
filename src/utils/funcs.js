export const baseUrl = "https://api.cloudflare.com/client/";
export const version = "v4";
export const byPassCors = "https://cors-anywhere.herokuapp.com/";
export const apiUrl = byPassCors + baseUrl + version;

/* our account */
// export const cloudflareToken = "RHa9LZg-XMTFNrrLKZt5pYe5mnDrJYTD93OSLMsE";

/* Robert's account */
export const cloudflareToken = "CGg43NdjE_uAxL7M0MCfj0NKxbtz7akRrVL1Taqr";

export const routeConstants = {
    zones: {
        create: "zones",
    },
    dns: {
        create: "",
    },
};

export const defaultNameServers = [
    "damon.ns.cloudflare.com",
    "athena.ns.cloudflare.com",
];

export const defaultDNS = (domain, type) => {
    if (type === "@") {
        return {
            type: "CNAME",
            name: `${domain}`,
            content: `mystudioboss.com`,
            ttl: 1,
            proxied: true,
        };
    } else {
        return {
            type: "CNAME",
            name: `www`,
            content: `mystudioboss.com`,
            ttl: 1,
            proxied: true,
        };
    }
};

export const slackLog = (data) => {
    let webhookURL =
        "https://hooks.slack.com/services/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";

    fetch(webhookURL, {
        method: "post",
        body: JSON.stringify(data),
    });
};
