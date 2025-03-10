import {
    DISPLAY_ALL_TRACKS,
    EXCLUSIVE_DISPLAY_TRACK_FOR_CONTESTANT,
    GET_NAVIGATION_TASK_SUCCESSFUL,
    GET_CONTESTANT_DATA_SUCCESSFUL,
    SET_DISPLAY,
    EXPAND_TRACKING_TABLE,
    SHRINK_TRACKING_TABLE,
    SHOW_LOWER_THIRDS,
    HIDE_LOWER_THIRDS,
    REMOVE_HIGHLIGHT_CONTESTANT_TABLE,
    HIGHLIGHT_CONTESTANT_TABLE,
    HIGHLIGHT_CONTESTANT_TRACK,
    REMOVE_HIGHLIGHT_CONTESTANT_TRACK,
    EXPLICITLY_DISPLAY_ALL_TRACKS,
    GET_CONTESTS_SUCCESSFUL,
    GLOBAL_MAP_ZOOM_FOCUS_CONTEST,
    DISPLAY_EVENT_SEARCH_MODAL,
    DISPLAY_DISCLAIMER_MODAL,
    FETCH_DISCLAIMER_SUCCESSFUL,
    DISPLAY_ABOUT_MODAL,
    FETCH_MY_PARTICIPATING_CONTESTS_SUCCESSFUL,
    GET_CONTESTS,
    FETCH_MY_PARTICIPATING_CONTESTS,
    TOGGLE_OPEN_AIP,
    GET_ONGOING_NAVIGATION_SUCCESSFUL,
    TOGGLE_SECRET_GATES,
    TOGGLE_BACKGROUND_MAP,
    FETCH_EDITABLE_ROUTE_SUCCESSFUL,
    FETCH_EDITABLE_ROUTE,
    FETCH_INITIAL_TRACKS_SUCCESS,
    TOGGLE_PROFILE_PICTURES,
    TOGGLE_GATE_ARROW,
    TOGGLE_DANGER_LEVEL,
    GET_NAVIGATION_TASK_FAILED,
    FETCH_INITIAL_TRACKS_FAILED,
    CURRENT_TIME,
    NEW_CONTESTANT,
    DELETE_CONTESTANT,
    GET_CONTESTANT_DATA_PLAYBACK_SUCCESSFUL,
    WEB_SOCKET_STATUS,
    GLOBAL_MAP_SET_VISIBLE_CONTESTS
} from "../constants/action-types";
import {SIMPLE_RANK_DISPLAY} from "../constants/display-types";
import {
    CREATE_TASK_SUCCESSFUL,
    CREATE_TASK_TEST_SUCCESSFUL,
    DELETE_TASK_SUCCESSFUL,
    DELETE_TASK_TEST_SUCCESSFUL, GET_CONTEST_RESULTS_FAILED,
    GET_CONTEST_RESULTS_SUCCESSFUL,
    GET_CONTEST_TEAMS_LIST_SUCCESSFUL,
    GET_TASK_TESTS_SUCCESSFUL,
    GET_TASKS_SUCCESSFUL, HIDE_ALL_TASK_DETAILS, HIDE_TASK_DETAILS,
    SHOW_TASK_DETAILS
} from "../constants/resultsServiceActionTypes";
import {DateTime} from "luxon";

const initialState = {
    navigationTask: {route: {waypoints: []}},
    navigationTaskError: null,
    contestantData: {},
    contestants: {},
    currentDisplay: {displayType: SIMPLE_RANK_DISPLAY},
    displayTracks: null,
    displayExpandedTrackingTable: false,
    isFetchingContestantData: {},
    initialLoadingContestantData: {},
    displayLowerThirds: null,
    displayGateArrow: true,
    displayDangerLevel: true,
    highlightContestantTrack: [],
    highlightContestantTable: [],
    contests: [],
    zoomContest: null,
    displayEventSearchModal: false,
    displayAboutModal: false,
    tasks: {},
    taskTests: {},
    contestResults: {},
    contestResultsErrors: {},
    teams: null,
    visibleTaskDetails: {},
    disclaimer: "",
    myParticipatingContests: [],
    currentContestRegistration: null,
    loadingMyParticipation: false,
    loadingContests: false,
    currentSelfRegisterTask: null,
    currentSelfRegisterParticipation: null,
    displayOpenAip: false,
    currentTime: null,
    ongoingNavigation: [],
    displaySecretGates: true,
    displayBackgroundMap: true,
    displayProfilePictures: true,
    editableRoutes: {},
    fetchingEditableRoute: false,
    initialTracks: {},
    webSocketOnline: true,
    globalMapVisibleContests: []
};

function emptyContestantData() {
    return Object.assign({}, {
        latest_time: "1970-01-01T00:00:00Z",
        positions: [],
        annotations: [],
        log_entries: [],
        playing_cards: [],
        gate_scores: [],
        more_data: true,
        progress: 0,
        gate_distance_and_estimate: null,
        danger_level: null,
        contestant_track: Object.assign({}, {
            current_state: "Waiting...",
            score: 0
        })
    })
}

function rootReducer(state = initialState, action) {
    if (action.type === SET_DISPLAY) {
        return Object.assign({}, state, {
            currentDisplay: action.payload
        })
    }
    if (action.type === GET_NAVIGATION_TASK_FAILED) {
        return Object.assign({}, state, {
            ...state,
            navigationTaskError: action.error,
        })
    }
    if (action.type === GET_NAVIGATION_TASK_SUCCESSFUL) {
        // This has to match whatever is generated by track data for contestant
        /*{"contestant_id": contestant.pk, "latest_time": global_latest_time, "positions": positions,
            "annotations": annotations,
            "contestant_track": contestant_track, "more_data": more_data}*/
        let contestantData = {}
        let contestants = {}
        let initialLoading = {}
        action.payload.contestant_set.map((contestant) => {
            contestantData[contestant.id] = emptyContestantData()
            contestants[contestant.id] = contestant
            initialLoading[contestant.id] = true
        })
        return Object.assign({}, state, {
            ...state,
            contestantData: contestantData,
            navigationTask: action.payload,
            navigationTaskError: null,
            contestants: contestants,
            initialLoadingContestantData: initialLoading
        })
    }
    if (action.type === FETCH_INITIAL_TRACKS_SUCCESS) {
        return Object.assign({}, state, {
            ...state,
            initialTracks: {
                ...state.initialTracks,
                [action.contestantId]: action.payload
            }
        })
    }
    if (action.type === FETCH_INITIAL_TRACKS_FAILED) {
        return state
    }
    if (action.type === CURRENT_TIME) {
        return Object.assign({}, state, {
            ...state,
            currentTime: action.payload.current_time,
            currentDateTime: DateTime.fromISO(action.payload.current_date_time)
        })
    }
    if (action.type === NEW_CONTESTANT) {
        return Object.assign({}, state, {
            ...state,
            contestantData: {
                ...state.contestantData,
                [action.payload.id]: emptyContestantData()
            },
            contestants: {
                ...state.contestants,
                [action.payload.id]: action.payload
            },
            initialLoadingContestantData: {
                ...state.initialLoadingContestantData,
                [action.payload.id]: false
            }
        })
    }
    if (action.type === DELETE_CONTESTANT) {
        const newState = Object.assign({}, state, {
            ...state,
            contestantData: {
                ...state.contestantData,
            },
            contestants: {
                ...state.contestants,
            },
            initialLoadingContestantData: {
                ...state.initialLoadingContestantData
            }
        })
        delete newState.initialLoadingContestantData[action.payload.contestant_id]
        delete newState.contestants[action.payload.contestant_id]
        delete newState.contestantData[action.payload.contestant_id]
        return newState
    }
    if (action.type === GET_CONTESTANT_DATA_SUCCESSFUL) {
        if (Object.keys(action.payload).length === 0) {
            return {
                ...state,
                isFetchingContestantData: {
                    ...state.isFetchingContestantData,
                    [action.payload.contestant_id]: false
                }
            }
        }
        // Handle the case where we get contestant data for an unknown contestant
        if (state.contestants[action.payload.contestant_id] === undefined) {
            return state
        }
        return {
            ...state,
            contestantData: {
                ...state.contestantData,
                [action.payload.contestant_id]: {
                    annotations: action.payload.annotations,
                    positions: action.payload.positions,

                    log_entries: action.payload.score_log_entries !== undefined ? action.payload.score_log_entries : state.contestantData[action.payload.contestant_id].log_entries,
                    gate_scores: action.payload.gate_scores !== undefined ? action.payload.gate_scores : state.contestantData[action.payload.contestant_id].gate_scores,
                    playing_cards: action.payload.playing_cards !== undefined ? action.payload.playing_cards : state.contestantData[action.payload.contestant_id].playing_cards,
                    latest_position_time: action.payload.positions !== undefined && action.payload.positions.length > 0 ? new Date(action.payload.positions.slice(-1)[0].time) : null,
                    progress: action.payload.progress !== undefined ? action.payload.progress : state.contestantData[action.payload.contestant_id].progress,
                    contestant_track: action.payload.contestant_track ? action.payload.contestant_track : state.contestantData[action.payload.contestant_id].contestant_track,
                    contestant_id: action.payload.contestant_id,
                    latest_time: action.payload.latest_time !== undefined ? action.payload.latest_time : null,
                    gate_distance_and_estimate: action.payload.gate_distance_and_estimate ? action.payload.gate_distance_and_estimate : state.contestantData[action.payload.contestant_id].gate_distance_and_estimate,
                    danger_level: action.payload.danger_level ? action.payload.danger_level : state.contestantData[action.payload.contestant_id].danger_level,
                }
            },
            isFetchingContestantData: {
                ...state.isFetchingContestantData,
                [action.payload.contestant_id]: false
            },
            initialLoadingContestantData: {
                ...state.initialLoadingContestantData,
                [action.payload.contestant_id]: false
            }
        }
    }
    if (action.type === GET_CONTESTANT_DATA_PLAYBACK_SUCCESSFUL) {
        if (Object.keys(action.payload).length === 0) {
            return {
                ...state,
                isFetchingContestantData: {
                    ...state.isFetchingContestantData,
                    [action.payload.contestant_id]: false
                }
            }
        }
        // Handle the case where we get contestant data for an unknown contestant
        if (state.contestants[action.payload.contestant_id] === undefined) {
            return state
        }
        return {
            ...state,
            isFetchingContestantData: {
                ...state.isFetchingContestantData,
                [action.payload.contestant_id]: false
            },
            initialLoadingContestantData: {
                ...state.initialLoadingContestantData,
                [action.payload.contestant_id]: false
            }
        }
    }
    if (action.type === HIGHLIGHT_CONTESTANT_TABLE) {
        return Object.assign({}, state, {
            highlightContestantTable: state.highlightContestantTable.concat([action.contestantId])
        });
    }
    if (action.type === REMOVE_HIGHLIGHT_CONTESTANT_TABLE) {
        return Object.assign({}, state, {
            highlightContestantTable: state.highlightContestantTable.filter((id) => {
                return id !== action.contestantId
            })
        });
    }

    if (action.type === HIGHLIGHT_CONTESTANT_TRACK) {
        return Object.assign({}, state, {
            highlightContestantTrack: state.highlightContestantTrack.concat([action.contestantId])
        });
    }
    if (action.type === REMOVE_HIGHLIGHT_CONTESTANT_TRACK) {
        return Object.assign({}, state, {
            highlightContestantTrack: state.highlightContestantTrack.filter((id) => {
                return id !== action.contestantId
            })
        });
    }
    if (action.type === DISPLAY_ALL_TRACKS) {
        return Object.assign({}, state, {
            displayTracks: null
        });
    }

    if (action.type === EXPLICITLY_DISPLAY_ALL_TRACKS) {
        if (!state.displayTracks || state.displayTracks.length < Object.keys(state.contestants).length) {
            return Object.assign({}, state, {
                displayTracks: Object.keys(state.contestants).map((id) => {
                    return parseInt(id)
                }),
            });
        } else {
            return Object.assign({}, state, {
                displayTracks: null,
            })
        }
    }
    if (action.type === EXCLUSIVE_DISPLAY_TRACK_FOR_CONTESTANT) {
        return Object.assign({}, state, {
            displayTracks: [action.payload.contestantId]
        });
    }
    if (action.type === EXPAND_TRACKING_TABLE) {
        return Object.assign({}, state, {
            displayExpandedTrackingTable: true
        });
    }
    if (action.type === SHRINK_TRACKING_TABLE) {
        return Object.assign({}, state, {
            displayExpandedTrackingTable: false
        });
    }
    if (action.type === SHOW_LOWER_THIRDS) {
        return Object.assign({}, state, {
            displayLowerThirds: action.contestantId
        });
    }
    if (action.type === HIDE_LOWER_THIRDS) {
        return Object.assign({}, state, {
            displayLowerThirds: null
        });
    }
    if (action.type === GET_CONTESTS) {
        return Object.assign({}, state, {
            loadingContests: true
        });
    }
    if (action.type === GET_CONTESTS_SUCCESSFUL) {
        const now = new Date()
        return Object.assign({}, state, {
            contests: action.payload,
            upcomingContests: action.payload.filter((contest) => {
                return new Date(contest.finish_time).getTime() > now.getTime()
            }),
            loadingContests: false
        })
    }
    if (action.type === TOGGLE_SECRET_GATES) {
        return Object.assign({}, state, {
            displaySecretGates: action.visible,
        })
    }

    if (action.type === WEB_SOCKET_STATUS) {
        return Object.assign({}, state, {
            webSocketOnline: action.payload,
        })
    }
    if (action.type === TOGGLE_BACKGROUND_MAP) {
        return Object.assign({}, state, {
            displayBackgroundMap: action.visible,
        })
    }
    if (action.type === TOGGLE_PROFILE_PICTURES) {
        return Object.assign({}, state, {
            displayProfilePictures: action.visible,
        })
    }
    if (action.type === GET_ONGOING_NAVIGATION_SUCCESSFUL) {
        return Object.assign({}, state, {
            ongoingNavigation: action.payload,
        })
    }

    if (action.type === GET_ONGOING_NAVIGATION_SUCCESSFUL) {
        return Object.assign({}, state, {
            ongoingNavigation: action.payload,
        })
    }
    if (action.type === GLOBAL_MAP_ZOOM_FOCUS_CONTEST) {

        return Object.assign({}, state, {
            zoomContest: action.payload
        })
    }
    if (action.type === DISPLAY_EVENT_SEARCH_MODAL) {
        return Object.assign({}, state, {
            displayEventSearchModal: action.payload
        })
    }
    if (action.type === TOGGLE_GATE_ARROW) {
        return Object.assign({}, state, {
            displayGateArrow: !state.displayGateArrow
        })
    }
    if (action.type === TOGGLE_DANGER_LEVEL) {
        return Object.assign({}, state, {
            displayDangerLevel: !state.displayDangerLevel
        })
    }
    if (action.type === DISPLAY_DISCLAIMER_MODAL) {
        return Object.assign({}, state, {
            displayDisclaimerModal: action.payload
        })
    }
    if (action.type === DISPLAY_ABOUT_MODAL) {
        return Object.assign({}, state, {
            displayAboutModal: action.payload
        })
    }
    if (action.type === FETCH_DISCLAIMER_SUCCESSFUL) {
        return Object.assign({}, state, {
            disclaimer: action.payload
        })

    }
    if (action.type === CREATE_TASK_SUCCESSFUL) {
        const remaining = state.tasks[action.contestId].filter((task) => {
            return task.id !== action.payload.id
        })
        return Object.assign({}, state, {
            ...state,
            tasks: {
                ...state.tasks,
                [action.contestId]: remaining.concat([action.payload])
            }
        })
    }
    if (action.type === CREATE_TASK_TEST_SUCCESSFUL) {
        const remaining = state.taskTests[action.contestId].filter((taskTest) => {
            return taskTest.id !== action.payload.id
        })
        return Object.assign({}, state, {
            ...state,
            taskTests: {
                ...state.taskTests,
                [action.contestId]: remaining.concat([action.payload])
            }
        })
    }
    if (action.type === DELETE_TASK_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            tasks: {
                ...state.tasks,
                [action.contestId]: state.tasks[action.contestId].filter((task) => {
                    return task.id !== action.payload
                })
            }
        })
    }

    if (action.type === DELETE_TASK_TEST_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            taskTests: {
                ...state.taskTests,
                [action.contestId]: state.taskTests[action.contestId].filter((taskTest) => {
                    return taskTest.id !== action.payload
                })
            }
        })
    }
    if (action.type === GET_TASKS_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            tasks: {
                ...state.tasks,
                [action.contestId]: action.payload
            }
        })
    }
    if (action.type === GET_TASK_TESTS_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            taskTests: {
                ...state.taskTests,
                [action.contestId]: action.payload
            }
        })
    }
    if (action.type === GET_CONTEST_TEAMS_LIST_SUCCESSFUL) {
        let teamsMap = state.teams ? state.teams : {}
        action.payload.map((team) => {
            teamsMap[team.id] = team
        })
        return Object.assign({}, state, {
            ...state,
            teams: teamsMap,
        })
    }
    if (action.type === SHOW_TASK_DETAILS) {
        return Object.assign({}, state, {
            ...state,
            visibleTaskDetails: {
                ...state.visibleTaskDetails,
                [action.taskId]: true
            }
        })
    }
    if (action.type === HIDE_TASK_DETAILS) {
        return Object.assign({}, state, {
            ...state,
            visibleTaskDetails: {
                ...state.visibleTaskDetails,
                [action.taskId]: false
            }
        })
    }
    if (action.type === HIDE_ALL_TASK_DETAILS) {
        return Object.assign({}, state, {
            ...state,
            visibleTaskDetails: {}
        })
    }
    if (action.type === GET_CONTEST_RESULTS_SUCCESSFUL) {
        const next = Object.assign({}, state, {
            ...state,
            contestResults: {
                ...state.contestResults,
                [action.contestId]: {
                    ...state.contestResults[action.contestId],
                    results: action.payload
                }
            }
        })
        delete next.contestResultsErrors[action.contestId]
        return next
    }
    if (action.type === GET_CONTEST_RESULTS_FAILED) {
        return Object.assign({}, state, {
            ...state,
            contestResultsErrors: {
                ...state.contestResultsErrors,
                [action.contestId]: action.payload
            }
        })
    }
    if (action.type === CREATE_TASK_SUCCESSFUL) {
        const remaining = state.tasks[action.contestId].filter((task) => {
            return task.id !== action.payload.id
        })
        return Object.assign({}, state, {
            ...state,
            tasks: {
                ...state.tasks,
                [action.contestId]: remaining.concat([action.payload])
            }
        })
    }
    if (action.type === CREATE_TASK_TEST_SUCCESSFUL) {
        const remaining = state.taskTests[action.contestId].filter((taskTest) => {
            return taskTest.id !== action.payload.id
        })
        return Object.assign({}, state, {
            ...state,
            taskTests: {
                ...state.taskTests,
                [action.contestId]: remaining.concat([action.payload])
            }
        })
    }
    if (action.type === DELETE_TASK_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            tasks: {
                ...state.tasks,
                [action.contestId]: state.tasks[action.contestId].filter((task) => {
                    return task.id !== action.payload
                })
            }
        })
    }
    if (action.type === DELETE_TASK_TEST_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            taskTests: {
                ...state.taskTests,
                [action.contestId]: state.taskTests[action.contestId].filter((taskTest) => {
                    return taskTest.id !== action.payload
                })
            }
        })
    }
    if (action.type === GET_TASKS_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            tasks: {
                ...state.tasks,
                [action.contestId]: action.payload
            }
        })
    }
    if (action.type === GET_TASK_TESTS_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            taskTests: {
                ...state.taskTests,
                [action.contestId]: action.payload
            }
        })
    }
    if (action.type === FETCH_MY_PARTICIPATING_CONTESTS) {
        return Object.assign({}, state, {
            loadingMyParticipation: true
        });
    }
    if (action.type === FETCH_EDITABLE_ROUTE) {
        return Object.assign({}, state, {
            fetchingEditableRoute: true
        });
    }
    if (action.type === FETCH_MY_PARTICIPATING_CONTESTS_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            myParticipatingContests: action.payload,
            loadingMyParticipation: false
        })
    }
    if (action.type === FETCH_EDITABLE_ROUTE_SUCCESSFUL) {
        return Object.assign({}, state, {
            ...state,
            editableRoutes: {
                ...state.editableRoutes,
                [action.payload.id]: action.payload
            },
            fetchingEditableRoute: false
        })
    }

    if (action.type === TOGGLE_OPEN_AIP) {
        return Object.assign({}, state, {
            ...state,
            displayOpenAip: !state.displayOpenAip
        })
    }

    if (action.type === GLOBAL_MAP_SET_VISIBLE_CONTESTS) {
        return Object.assign({}, state, {...state, globalMapVisibleContests: action.payload})
    }

    return state;
}

export default rootReducer;