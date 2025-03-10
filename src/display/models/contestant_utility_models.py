from django.db import models

from display.calculators.positions_and_gates import Position
from display.fields.my_pickled_object_field import MyPickledObjectField


class ContestantUploadedTrack(models.Model):
    """
    Store a gps track that has been manually uploaded through the API or GUI. They can only be one of these for a
    contestant, and if this is present it will be preferred over anything received through traccar.
    """
    contestant = models.OneToOneField("Contestant", on_delete=models.CASCADE)
    track = MyPickledObjectField(default=list, help_text="List of traccar position reports (Dict)")


class ContestantReceivedPosition(models.Model):
    """
    Represents a position received from traccar. Includes timestamps that can be used to calculate processing
    statistics.
    """
    contestant = models.ForeignKey("Contestant", on_delete=models.CASCADE)
    time = models.DateTimeField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField(default=0)
    course = models.FloatField()
    speed = models.FloatField(default=0)
    interpolated = models.BooleanField(default=False)
    processor_received_time = models.DateTimeField(blank=True, null=True)
    calculator_received_time = models.DateTimeField(blank=True, null=True)
    websocket_transmitted_time = models.DateTimeField(blank=True, null=True)
    server_time = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("time",)

    @staticmethod
    def convert_to_traccar(positions: list["ContestantReceivedPosition"]) -> list[Position]:
        """
        Converts the list of contestant received positions to a list of traccar positions dictionaries
        """
        try:
            contestant = positions[0].contestant
        except IndexError:
            return []
        return [
            Position(
                **contestant.generate_position_block_for_contestant(
                    {
                        "deviceId": contestant.tracker_device_id,
                        "id": index,
                        "latitude": float(point.latitude),
                        "longitude": float(point.longitude),
                        "altitude": 0,
                        "attributes": {"batteryLevel": 1.0},
                        "speed": 0.0,
                        "course": point.course,
                        "device_time": point.time,
                    },
                    point.time,
                ),
                interpolated=point.interpolated,
            )
            for index, point in enumerate(positions)
        ]
