from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit


def safe_link(value, allow_bare_domain=False):
    value = str(value).strip()
    parsed = urlsplit(value)
    if parsed.scheme.lower() in ('https', 'http', 'mailto', 'tel') or (not parsed.scheme and not parsed.netloc and value.startswith(('/', '#'))):
        return value
    if allow_bare_domain and not parsed.scheme and not parsed.netloc and ' ' not in value:
        external = urlsplit(f'https://{value}')
        if external.hostname and '.' in external.hostname:
            return external.geturl()
    return ''


class CleanText(HTMLParser):
    tags = {'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.result = []

    def handle_starttag(self, tag, attrs):
        if tag in self.tags:
            self.result.append('<' + tag + '>')
        elif tag == 'a':
            href = safe_link(dict(attrs).get('href', ''))
            self.result.append('<a href="' + escape(href, quote=True) + '" rel="noopener noreferrer">')

    def handle_endtag(self, tag):
        if tag in self.tags | {'a'} and tag != 'br':
            self.result.append('</' + tag + '>')

    def handle_data(self, data):
        self.result.append(escape(data))


def clean_text(value):
    if '<' not in value:
        return value
    parser = CleanText()
    parser.feed(value)
    return ''.join(parser.result)


def clean_data(value):
    if isinstance(value, dict):
        return {key: (safe_link(item, allow_bare_domain=key in ('href', 'button_href')) if key in ('href', 'button_href', 'image_url') and isinstance(item, str) else clean_data(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [clean_data(item) for item in value]
    return clean_text(value) if isinstance(value, str) else value
