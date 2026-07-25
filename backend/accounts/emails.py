from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail

from .email_i18n import RTL_LANGUAGES, get_strings, user_language

BRAND = {
    'bg': '#eeeee7',
    'surface': '#ffffff',
    'surface_2': '#f6f5ef',
    'ink': '#20242b',
    'ink_soft': '#5c6169',
    'accent': '#d9622b',
    'accent_ink': '#ffffff',
    'border': '#e4e2d8',
    'muted': '#9b9da5',
}

FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def render_email_html(preheader, heading, body_html, cta_text=None, cta_url=None, language='en'):
    is_rtl = language in RTL_LANGUAGES
    dir_attr = 'rtl' if is_rtl else 'ltr'
    align = 'right' if is_rtl else 'left'

    cta_block = ''
    if cta_text and cta_url:
        cta_block = f'''
        <tr><td style="padding:0 32px 12px 32px;text-align:{align};">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:{'0 0 0 auto' if is_rtl else '0 auto 0 0'};"><tr>
            <td style="border-radius:10px;background-color:{BRAND['accent']};">
              <a href="{cta_url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;
                color:{BRAND['accent_ink']};text-decoration:none;border-radius:10px;font-family:{FONT_STACK};">{cta_text}</a>
            </td>
          </tr></table>
        </td></tr>
        '''

    return f'''<!DOCTYPE html>
<html dir="{dir_attr}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Language Partner</title>
</head>
<body dir="{dir_attr}" style="margin:0;padding:0;background-color:{BRAND['bg']};font-family:{FONT_STACK};">
<span style="display:none;font-size:1px;color:{BRAND['bg']};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{BRAND['bg']};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="{dir_attr}" style="max-width:480px;background-color:{BRAND['surface']};border-radius:16px;overflow:hidden;border:1px solid {BRAND['border']};text-align:{align};">
<tr><td style="background-color:{BRAND['accent']};padding:20px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" dir="{dir_attr}"><tr>
<td style="width:32px;height:32px;background-color:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;
  font-weight:700;color:{BRAND['accent']};font-size:14px;font-family:{FONT_STACK};">LP</td>
<td style="padding-{'right' if is_rtl else 'left'}:10px;font-weight:700;font-size:16px;color:#ffffff;font-family:{FONT_STACK};">Language Partner</td>
</tr></table>
</td></tr>
<tr><td style="padding:36px 32px 8px 32px;">
<h1 style="margin:0 0 14px 0;font-size:20px;font-weight:700;color:{BRAND['ink']};font-family:{FONT_STACK};text-align:{align};">{heading}</h1>
{body_html}
</td></tr>
{cta_block}
<tr><td style="padding:8px 32px 32px 32px;">
<p style="margin:16px 0 0 0;font-size:13px;color:{BRAND['ink_soft']};font-family:{FONT_STACK};text-align:{align};">{get_strings(language, 'common')[1]['footer_note']}</p>
</td></tr>
</table>
<p style="margin:20px 0 0 0;font-size:12px;color:{BRAND['muted']};font-family:{FONT_STACK};">© Language Partner</p>
</td></tr>
</table>
</body>
</html>'''


def detail_row(label, value, language='en'):
    align = 'right' if language in RTL_LANGUAGES else 'left'
    return f'''
    <tr>
      <td style="padding:4px 0;font-size:13px;color:{BRAND['ink_soft']};width:110px;font-family:{FONT_STACK};text-align:{align};">{label}</td>
      <td style="padding:4px 0;font-size:13px;color:{BRAND['ink']};font-weight:600;font-family:{FONT_STACK};text-align:{align};">{value}</td>
    </tr>
    '''


def detail_table(rows_html):
    return f'''
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;padding:16px;background-color:{BRAND['surface_2']};border-radius:12px;">
      {rows_html}
    </table>
    '''


def send_plain_email(to_email, subject, body):
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)


def send_html_email(to_email, subject, html_body, text_body):
    message = EmailMultiAlternatives(subject, text_body, settings.DEFAULT_FROM_EMAIL, [to_email])
    message.attach_alternative(html_body, 'text/html')
    message.send(fail_silently=False)


def send_verification_email(user, code):
    language = user_language(user)
    strings, common = get_strings(language, 'verify')
    name = user.first_name or user.email

    html = render_email_html(
        preheader=strings['preheader'].format(code=code),
        heading=strings['heading'],
        body_html=f'''
        <p style="margin:0 0 20px 0;font-size:14px;color:{BRAND['ink_soft']};line-height:1.6;font-family:{FONT_STACK};">
          {strings['body'].format(name=name)}
        </p>
        <div style="margin:0 0 8px 0;padding:18px;background-color:{BRAND['surface_2']};border-radius:12px;text-align:center;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:{BRAND['ink']};font-family:'SFMono-Regular',Consolas,Menlo,monospace;">{code}</span>
        </div>
        ''',
        language=language,
    )
    text = (
        f'{common["greeting"].format(name=name)}\n\n'
        f'{strings["text_code"].format(code=code)}\n\n'
        f'{strings["text_expiry"]}'
    )
    send_html_email(user.email, strings['subject'], html, text)


def send_password_reset_email(user, code):
    language = user_language(user)
    strings, common = get_strings(language, 'password_reset')
    name = user.first_name or user.email

    html = render_email_html(
        preheader=strings['preheader'].format(code=code),
        heading=strings['heading'],
        body_html=f'''
        <p style="margin:0 0 20px 0;font-size:14px;color:{BRAND['ink_soft']};line-height:1.6;font-family:{FONT_STACK};">
          {strings['body'].format(name=name)}
        </p>
        <div style="margin:0 0 8px 0;padding:18px;background-color:{BRAND['surface_2']};border-radius:12px;text-align:center;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:{BRAND['ink']};font-family:'SFMono-Regular',Consolas,Menlo,monospace;">{code}</span>
        </div>
        ''',
        language=language,
    )
    text = (
        f'{common["greeting"].format(name=name)}\n\n'
        f'{strings["text_code"].format(code=code)}\n\n'
        f'{strings["text_expiry"]}'
    )
    send_html_email(user.email, strings['subject'], html, text)


def send_login_code_email(user, code):
    language = user_language(user)
    strings, common = get_strings(language, 'login_code')
    name = user.first_name or user.email

    html = render_email_html(
        preheader=strings['preheader'].format(code=code),
        heading=strings['heading'],
        body_html=f'''
        <p style="margin:0 0 20px 0;font-size:14px;color:{BRAND['ink_soft']};line-height:1.6;font-family:{FONT_STACK};">
          {strings['body'].format(name=name)}
        </p>
        <div style="margin:0 0 8px 0;padding:18px;background-color:{BRAND['surface_2']};border-radius:12px;text-align:center;">
          <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:{BRAND['ink']};font-family:'SFMono-Regular',Consolas,Menlo,monospace;">{code}</span>
        </div>
        ''',
        language=language,
    )
    text = (
        f'{common["greeting"].format(name=name)}\n\n'
        f'{strings["text_code"].format(code=code)}\n\n'
        f'{strings["text_expiry"]}'
    )
    send_html_email(user.email, strings['subject'], html, text)
