const MAX_RETRIES = 5;

const RegularExpression = {
	Allow: /^([Aa]llow:) (\/.+)$/g,
	Disallow: /^([Dd]isallow:) (\/.+)$/g,
	Host: /^([Hh]ost:) (.+)$/g,
	NewLine: /[^\r\n]+/g,
	SiteMap: /^([Ss]itemap:) (.+)$/,
	UserAgent: /^([Uu]ser-agent:) (.+)$/g,
};

export { MAX_RETRIES, RegularExpression };
