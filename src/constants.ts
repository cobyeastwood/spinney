const MAX_RETRIES = 5;

const Attribute = {
	Href: 'href',
};

const RegExps = {
	Allow: /^([Aa]llow:) (\/.+)$/g,
	Disallow: /^([Dd]isallow:) (\/.+)$/g,
	Host: /^([Hh]ost:) (.+)$/g,
	NewLine: /[^\r\n]+/g,
	SiteMap: /^([Ss]itemap:) (.+)$/,
	SpecialCharacter: /[^a-zA-Z0-9 ]/g,
	UserAgent: /^([Uu]ser-[Aa]gent:) (.+)$/g,
	ForwardSlashWord: /\/(\w+)/gi,
	HttpOrHttps:
		/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi,
	getHostnameAndPathname: (hostname: string, pathname: string) =>
		new RegExp(`(.*\.)?${hostname}.*(${pathname})`),
	getURL: () =>
		new RegExp(
			`^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$`,
			'i'
		),
};

export { MAX_RETRIES, RegExps, Attribute };
