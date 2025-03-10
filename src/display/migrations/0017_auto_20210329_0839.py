# Generated by Django 3.1.7 on 2021-03-29 08:39

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('display', '0016_auto_20210327_0805'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='is_public',
            field=models.BooleanField(default=False, help_text="If true, the person's name will be displayed together with the callsign on the global map"),
        ),
        migrations.AlterField(
            model_name='navigationtask',
            name='scorecard',
            field=models.ForeignKey(help_text='Reference to an existing scorecard name. Currently existing scorecards: <function NavigationTask.<lambda> at 0x7fd416021950>', on_delete=django.db.models.deletion.PROTECT, to='display.scorecard'),
        ),
    ]
