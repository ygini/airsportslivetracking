import datetime
from multiprocessing import Queue

import matplotlib.pyplot as plt
import logging
from typing import List, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon

from display.calculators.calculator import Calculator
from display.calculators.calculator_utilities import PolygonHelper, get_shortest_intersection_time
from display.calculators.positions_and_gates import Position, Gate
from display.calculators.update_score_message import UpdateScoreMessage
from display.models import Contestant, Scorecard, Route, INFORMATION, ANOMALY

logger = logging.getLogger(__name__)


class AnrCorridorCalculator(Calculator):
    """
    Implements https://www.fai.org/sites/default/files/documents/gac_2020_precision_flying_rules_final.pdf
    """

    def passed_finishpoint(self, track: List["Position"], last_gate: "Gate"):
        position = track[-1]
        self.has_passed_finish_point = True
        if self.corridor_state == self.OUTSIDE_CORRIDOR:
            self.check_and_apply_outside_penalty(position, self.crossed_outside_gate or last_gate, reset=True)
            self.corridor_state = self.INSIDE_CORRIDOR

    def calculate_outside_route(self, track: List["Position"], last_gate: "Gate"):
        self.enroute = False
        self.accumulated_score = 0
        self.has_passed_finish_point = False

    INSIDE_CORRIDOR = 0
    OUTSIDE_CORRIDOR = 1
    OUTSIDE_CORRIDOR_PENALTY_TYPE = "outside_corridor"

    def __init__(
        self,
        contestant: "Contestant",
        scorecard: "Scorecard",
        gates: List["Gate"],
        route: "Route",
        score_processing_queue: Queue,
    ):
        super().__init__(contestant, scorecard, gates, route, score_processing_queue)
        self.corridor_state = self.INSIDE_CORRIDOR
        self.previous_corridor_state = self.INSIDE_CORRIDOR
        self.crossed_outside_time = None
        self.last_outside_penalty = None
        self.last_gate_missed_position = None
        self.previous_last_gate = None
        self.crossed_outside_position = None
        self.crossed_outside_gate = None
        self.enroute = False
        self.corridor_grace_time = self.scorecard.corridor_grace_time
        waypoint = self.contestant.navigation_task.route.waypoints[0]
        self.polygon_helper = PolygonHelper(waypoint.latitude, waypoint.longitude)
        self.track_polygon = self.build_polygon()
        self.existing_reference = None
        self.accumulated_score = 0
        self.plot_polygon()
        self.previous_existing_reference = None

    def get_danger_level_and_accumulated_score(self, track: List["Position"]) -> Tuple[float, float]:
        """
        Danger level ranges from 0 to 100 where 100 is outside the corridor, and all other numbers represent half seconds
        """
        if not self.enroute:
            return 0, 0
        LOOKAHEAD_SECONDS = 30
        if self.corridor_state == self.OUTSIDE_CORRIDOR:
            return 100, self.accumulated_score
        distance_danger = 0
        shortest_time = get_shortest_intersection_time(
            track, self.polygon_helper, [("test", self.track_polygon)], LOOKAHEAD_SECONDS, from_inside=True
        )
        lookahead_danger = 99 * (LOOKAHEAD_SECONDS - shortest_time) / LOOKAHEAD_SECONDS
        if len(track) > 0:
            position = track[-1]
            MAXIMUM_DISTANCE = 1852  # m
            polygon_distance = min(
                [MAXIMUM_DISTANCE, self._distance_from_point_to_polygons(position.latitude, position.longitude)]
            )
            distance_danger = 30 * (MAXIMUM_DISTANCE - polygon_distance) / MAXIMUM_DISTANCE
        return max([lookahead_danger, distance_danger]), self.accumulated_score

    def build_polygon(self):
        points = []
        for waypoint in self.contestant.navigation_task.route.waypoints:
            if waypoint.left_corridor_line is not None:
                # This is the preferred option, using the gate line is for backwards compatibility
                points.extend(waypoint.left_corridor_line)
            else:
                points.append(waypoint.gate_line[0])
        for waypoint in reversed(self.contestant.navigation_task.route.waypoints):
            if waypoint.right_corridor_line is not None:
                # This is the preferred option, using the gate line is for backwards compatibility
                points.extend(list(reversed(waypoint.right_corridor_line)))
            else:
                points.append(waypoint.gate_line[1])
        points = np.array(points)
        transformed_points = self.polygon_helper.utm.transform_points(
            self.polygon_helper.pc, points[:, 1], points[:, 0]
        )
        return Polygon(transformed_points)

    def plot_polygon(self):
        # imagery = OSM()
        ax = plt.axes(projection=self.polygon_helper.utm)
        # ax.add_image(imagery, 8)
        ax.set_aspect("auto")
        ax.plot(self.track_polygon.boundary.xy[0], self.track_polygon.boundary.xy[1])
        ax.add_geometries([self.track_polygon], crs=self.polygon_helper.utm, facecolor="blue", alpha=0.4)
        plt.savefig("polygon.png", dpi=100)

    def _check_inside_polygon(self, latitude: float, longitude: float) -> bool:
        """
        Returns true if the point lies inside the corridor
        """
        return "test" in self.polygon_helper.check_inside_polygons([("test", self.track_polygon)], latitude, longitude)

    def _distance_from_point_to_polygons(self, latitude: float, longitude: float) -> float:
        """
        :return: Distance to inside or outside the polygon (metres)
        """
        return self.polygon_helper.distance_from_point_to_polygons([("test", self.track_polygon)], latitude, longitude)[
            "test"
        ]

    def calculate_enroute(
        self, track: List["Position"], last_gate: "Gate", in_range_of_gate: "Gate", next_gate: Optional["Gate"]
    ):
        self.enroute = True
        self.check_outside_corridor(track, last_gate)

    def missed_gate(self, previous_gate: Optional[Gate], gate: Gate, position: Position):
        if self.crossed_outside_time is None or self.has_passed_finish_point:
            #  If we have passed the finish point, we have already handled that the gate has been missed.
            return
        penalty_gate = previous_gate or gate
        # Reset scoring to start counting again, but this time without grace time since we might be outside
        # outside_time = (position.time - self.crossed_outside_time).total_seconds()
        # Correct for any remaining grace time if we exited the corridor immediately before the gate
        # self.corridor_grace_time = max(0, self.corridor_grace_time - outside_time)
        if position == self.last_gate_missed_position:
            # If we are at the same position as the last missed the gate it means that we are missing several gates
            # in a row. We need to apply maximum penalty for each leg
            self.crossed_outside_position = position
            self.crossed_outside_time = position.time
            self.existing_reference = None
            self.accumulated_score = 0
            self.check_and_apply_outside_penalty(position, penalty_gate, apply_maximum_penalty=True)
        else:
            self.check_and_apply_outside_penalty(position, penalty_gate, reset=True)
            self.crossed_outside_position = position
            self.crossed_outside_time = position.time
        self.last_gate_missed_position = position

    def check_and_apply_outside_penalty(
        self, position: "Position", last_gate: Gate, apply_maximum_penalty: bool = False, reset: bool = False
    ):
        if self.crossed_outside_time is None or last_gate is None:
            return
        # If we are back inside the corridor because we must calculate the score for the previous second
        if self.corridor_state == self.INSIDE_CORRIDOR:
            current_time = position.time - datetime.timedelta(seconds=1)
        else:
            current_time = position.time
        outside_time = (current_time - self.crossed_outside_time).total_seconds()
        penalty_time = np.round(outside_time - self.corridor_grace_time)
        self.accumulated_score = (
            self.scorecard.corridor_outside_penalty * penalty_time if outside_time > self.corridor_grace_time else 0
        )
        if apply_maximum_penalty:
            self.accumulated_score = max(self.scorecard.corridor_maximum_penalty, 0)

        # If this is called when we have crossed a gate, we need to reset the outside time to Grace time before now to start counting new points
        if self.corridor_state == self.OUTSIDE_CORRIDOR and self.previous_corridor_state == self.INSIDE_CORRIDOR:
            self.update_score(UpdateScoreMessage(
                position.time,
                self.get_last_non_secret_gate(last_gate),
                0,
                "exiting corridor",
                position.latitude,
                position.longitude,
                INFORMATION,
                f"{self.OUTSIDE_CORRIDOR_PENALTY_TYPE}_{last_gate.name}",
            ))
        elif apply_maximum_penalty:
            self.update_score(UpdateScoreMessage(
                position.time,
                self.get_last_non_secret_gate(last_gate),
                self.accumulated_score,
                "outside corridor ({} s)".format(int(outside_time)),
                position.latitude,
                position.longitude,
                ANOMALY,
                f"{self.OUTSIDE_CORRIDOR_PENALTY_TYPE}_{last_gate.name}",
                maximum_score=self.scorecard.corridor_maximum_penalty,
            ))
        elif (
            self.corridor_state == self.INSIDE_CORRIDOR and self.previous_corridor_state == self.OUTSIDE_CORRIDOR
        ) or reset:
            # Update initial score logged with the final score
            self.update_score(UpdateScoreMessage(
                position.time,
                self.get_last_non_secret_gate(last_gate),
                self.accumulated_score,
                "outside corridor ({} s)".format(int(outside_time)),
                position.latitude,
                position.longitude,
                ANOMALY,
                f"{self.OUTSIDE_CORRIDOR_PENALTY_TYPE}_{last_gate.name}",
                maximum_score=self.scorecard.corridor_maximum_penalty,
            ))
            if not reset:
                # Do not print entering corridor if you are in the special case where we are cleaning up missed gates (indicated by apply maximum penalty)
                self.corridor_grace_time = self.scorecard.corridor_grace_time
            else:
                # Correct for any remaining grace time if we exited the corridor immediately before the gate
                self.corridor_grace_time = max(0, self.corridor_grace_time - outside_time)

            self.existing_reference = None
            self.accumulated_score = 0

        self.previous_existing_reference = self.existing_reference

    def check_outside_corridor(self, track: List["Position"], last_gate: "Gate"):
        self.previous_corridor_state = self.corridor_state
        position = track[-1]
        if not self._check_inside_polygon(position.latitude, position.longitude):
            # We are outside the corridor
            if self.corridor_state == self.INSIDE_CORRIDOR:
                logger.info("{} {}: Heading outside of corridor".format(self.contestant, position.time))

                self.crossed_outside_position = position
                self.corridor_state = self.OUTSIDE_CORRIDOR
                self.crossed_outside_time = position.time
                self.crossed_outside_gate = last_gate
            self.check_and_apply_outside_penalty(position, last_gate)
        elif self.corridor_state == self.OUTSIDE_CORRIDOR:
            self.existing_reference = None
            self.accumulated_score = 0
            logger.info("{} {}: Back inside the corridor".format(self.contestant, position.time))
            self.corridor_state = self.INSIDE_CORRIDOR
            self.check_and_apply_outside_penalty(position, last_gate)
            self.corridor_grace_time = self.scorecard.corridor_grace_time
            self.crossed_outside_position = None
            self.crossed_outside_time = None

        self.previous_last_gate = last_gate
