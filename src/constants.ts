const MAX_RETRIES = 5;

const Attribute = {
	Href: 'href',
};

const RegularExpression = {
	Allow: /^([Aa]llow:) (\/.+)$/g,
	Disallow: /^([Dd]isallow:) (\/.+)$/g,
	Host: /^([Hh]ost:) (.+)$/g,
	NewLine: /[^\r\n]+/g,
	SiteMap: /^([Ss]itemap:) (.+)$/,
	SpecialCharachter: /[^a-zA-Z0-9 ]/g,
	UserAgent: /^([Uu]ser-agent:) (.+)$/g,
	ForwardSlashWord: /\/(\w+)/gi,
	HttpOrHttps:
		/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi,
};

export { MAX_RETRIES, RegularExpression, Attribute };
