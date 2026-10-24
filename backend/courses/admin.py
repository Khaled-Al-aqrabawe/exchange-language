from django import forms
from django.contrib import admin

from .models import Material


class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultipleFileField(forms.FileField):
    widget = MultipleFileInput

    def clean(self, data, initial=None):
        single = super().clean
        if isinstance(data, (list, tuple)):
            return [single(f, initial) for f in data]
        return [single(data, initial)]


class MaterialAdminForm(forms.ModelForm):
    class Meta:
        model = Material
        fields = ['language', 'level', 'description', 'file']


class MaterialBulkAddForm(forms.ModelForm):
    files = MultipleFileField(label='Files', help_text='Select all lesson files at once.')

    class Meta:
        model = Material
        fields = ['language', 'level', 'description']


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'language', 'level', 'order', 'created_at']
    list_filter = ['language', 'level']
    search_fields = ['title', 'description']
    ordering = ['language', 'level', 'order']

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            kwargs['form'] = MaterialBulkAddForm
            kwargs['fields'] = ['language', 'level', 'description']
        else:
            kwargs['form'] = MaterialAdminForm
            kwargs['fields'] = ['title', 'language', 'level', 'order', 'description', 'file']
        return super().get_form(request, obj, **kwargs)

    def save_model(self, request, obj, form, change):
        if change:
            return super().save_model(request, obj, form, change)
        files = form.cleaned_data['files']
        for f in files:
            Material.objects.create(
                language=obj.language, level=obj.level, description=obj.description, file=f,
            )
        self.message_user(request, f'{len(files)} file(s) uploaded.')

    def response_add(self, request, obj, post_url_continue=None):
        # obj is unsaved (files are created in save_model), so go back to the list
        return self.response_post_save_add(request, obj)

    def log_addition(self, request, obj, message):
        pass
