from django.conf import settings
from django.utils import translation
from django.utils.dateformat import format as django_date_format

from accounts.email_i18n import get_strings, user_language
from accounts.emails import BRAND, FONT_STACK, detail_row, detail_table, render_email_html, send_html_email


def _when(session, language):
    with translation.override(language):
        start = django_date_format(session.scheduled_time, 'l, F d · H:i')
        if session.window_end_time:
            end = django_date_format(session.window_end_time, 'H:i T')
            return f'{start}–{end} (choose a time)'
        return f'{start} {django_date_format(session.scheduled_time, "T")}'


def _session_details(session, language, common):
    duration = common['minutes'].format(n=session.duration_minutes)
    rows = (
        detail_row(common['when_label'], _when(session, language), language)
        + detail_row(common['duration_label'], duration, language)
    )
    return detail_table(rows)


def send_session_invitation_email(session):
    language = user_language(session.partner)
    strings, common = get_strings(language, 'invitation')
    schedule_url = f'{settings.FRONTEND_URL}/schedule'
    partner_name = session.partner.first_name or session.partner.email

    html = render_email_html(
        preheader=strings['preheader'].format(host=session.host.full_name),
        heading=strings['heading'],
        body_html=f'''
        <p style="margin:0 0 20px 0;font-size:14px;color:{BRAND['ink_soft']};line-height:1.6;font-family:{FONT_STACK};">
          {strings['body'].format(name=partner_name, host=f"<strong style='color:{BRAND['ink']};'>{session.host.full_name}</strong>")}
        </p>
        {_session_details(session, language, common)}
        ''',
        cta_text=strings['cta'],
        cta_url=schedule_url,
        language=language,
    )
    text = (
        f'{common["greeting"].format(name=partner_name)}\n\n'
        f'{strings["text_body"].format(host=session.host.full_name, when=_when(session, language))}\n\n'
        f'{strings["text_link"].format(url=schedule_url)}'
    )
    send_html_email(session.partner.email, strings['subject'].format(host=session.host.full_name), html, text)


def send_session_confirmed_email(session):
    language = user_language(session.host)
    strings, common = get_strings(language, 'confirmed')
    schedule_url = f'{settings.FRONTEND_URL}/schedule'
    host_name = session.host.first_name or session.host.email

    html = render_email_html(
        preheader=strings['preheader'].format(partner=session.partner.full_name),
        heading=strings['heading'],
        body_html=f'''
        <p style="margin:0 0 20px 0;font-size:14px;color:{BRAND['ink_soft']};line-height:1.6;font-family:{FONT_STACK};">
          {strings['body'].format(name=host_name, partner=f"<strong style='color:{BRAND['ink']};'>{session.partner.full_name}</strong>")}
        </p>
        {_session_details(session, language, common)}
        ''',
        cta_text=strings['cta'],
        cta_url=schedule_url,
        language=language,
    )
    text = (
        f'{common["greeting"].format(name=host_name)}\n\n'
        f'{strings["text_body"].format(partner=session.partner.full_name, when=_when(session, language))}\n\n'
        f'{strings["text_link"].format(url=schedule_url)}'
    )
    send_html_email(session.host.email, strings['subject'].format(partner=session.partner.full_name), html, text)


def send_session_reminder_email(session, recipient_user):
    other = session.partner if recipient_user.id == session.host_id else session.host
    language = user_language(recipient_user)
    strings, common = get_strings(language, 'reminder')
    recipient_name = recipient_user.first_name or recipient_user.email
    call_url = f'{settings.FRONTEND_URL}/call/{session.room_id}'

    html = render_email_html(
        preheader=strings['preheader'].format(other=other.full_name),
        heading=strings['heading'],
        body_html=f'''
        <p style="margin:0 0 20px 0;font-size:14px;color:{BRAND['ink_soft']};line-height:1.6;font-family:{FONT_STACK};">
          {strings['body'].format(name=recipient_name, other=f"<strong style='color:{BRAND['ink']};'>{other.full_name}</strong>")}
        </p>
        {_session_details(session, language, common)}
        ''',
        cta_text=strings['cta'],
        cta_url=call_url,
        language=language,
    )
    text = (
        f'{common["greeting"].format(name=recipient_name)}\n\n'
        f'{strings["text_body"].format(other=other.full_name, when=_when(session, language))}\n\n'
        f'{strings["text_link"].format(url=call_url)}'
    )
    send_html_email(recipient_user.email, strings['subject'], html, text)
