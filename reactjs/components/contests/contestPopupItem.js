import React, {Component} from "react";
import TaskItem from "./taskItem";
import {Link} from "react-router-dom";
import {mdiContentCopy, mdiShare, mdiCog} from "@mdi/js";
import Icon from "@mdi/react";
import CopyToClipboard from "react-copy-to-clipboard";
import {sortStartAndFinishTimes} from "./utilities";


export default class ContestPopupItem extends Component {
    constructor(props) {
        super(props)
        this.state = {copied: false}
    }

    registerButton(contest, participation, link) {
        if (participation) {
            if (link) {
                return <Link to={"/participation/myparticipation/" + participation.id + "/"}>
                    <button className={"btn btn-danger"}>Manage crew</button>
                </Link>
            } else {
                return <a href={"/participation/myparticipation/" + participation.id + "/"}>
                    <button className={"btn btn-danger"}>Manage crew</button>
                </a>
            }
        } else {
            if (link) {
                return <Link to={"/participation/" + this.props.contest.id + "/register/"}>
                    <button className={"btn btn-danger"}>Register crew</button>
                </Link>
            } else {
                return <a href={"/participation/" + this.props.contest.id + "/register/"}>
                    <button className={"btn btn-danger"}>Register crew</button>
                </a>
            }
        }

    }

    render() {
        const tasks = this.props.contest.navigationtask_set.sort(sortStartAndFinishTimes)
        return <div className={""} key={"contest" + this.props.contest.id}>
            <img className={"mx-auto d-block"}
                 src={this.props.contest.header_image && this.props.contest.header_image.length > 0 ? this.props.contest.header_image : "/static/img/airsportslogo.png"}
                 alt={"Contest promo image"} style={{maxHeight: "200px", maxWidth: "260px"}}/>
            <div className={""}>
                <h5 className={"card-title"}>{this.props.contest.name}</h5>
                <h6 className={"card-subtitle mb-2 text-muted"}>
                    {this.props.contest.contest_website.length > 0 ?
                        <a style={{float: "right"}} href={this.props.contest.contest_website}>Website</a> : ""}
                    {new Date(this.props.contest.start_time).toLocaleDateString()} - {new Date(this.props.contest.finish_time).toLocaleDateString()}

                </h6>

                <span style={{fontSize: "18px"}}>
                    {new Date(this.props.contest.finish_time) > new Date() ? this.registerButton(this.props.contest, this.props.participation, this.props.link) : null}
                </span>&nbsp;
                <span style={{"paddingTop": "0.3em", fontSize: "20px"}}
                      className={"badge badge-dark badge-pill"}>{this.props.contest.contest_team_count} </span>
                <div style={{float: "right"}}><h6>
                    {this.props.contest.is_editor || document.configuration.isSuperuser ?
                        <a href={document.configuration.contestDetailsViewUrl(this.props.contest.id)}><Icon path={mdiCog}
                                                                                          title={"Manage contest"}
                                                                                          size={1.5}
                                                                                          color={"black"}/></a> : null}
                    {this.props.link ? <CopyToClipboard
                        text={"https://airsports.no/global/contest_details/" + this.props.contest.id + "/"}
                        onCopy={() => this.setState({copied: true})}
                    >
                        {!this.state.copied ?
                            <Icon path={mdiContentCopy} title={"Copy URL"} size={1.5} color={"black"}/> :
                            <Icon path={mdiContentCopy} title={"URL copied to clipboard"} size={1.5}
                                  color={"grey"}/>}
                    </CopyToClipboard> : null}
                    <a href={"/global/contest_details/" + this.props.contest.id + "/"}><Icon path={mdiShare}
                                                                                             title={"Direct link"}
                                                                                             size={1.5}
                                                                                             color={"black"}/></a>
                </h6>
                </div>
                <hr/>
                <ul className={"d-flex flex-wrap justify-content-around"}
                    style={{paddingLeft: "0px", columnGap: "5px", rowGap: "5px"}}>
                    {tasks.map((task) => {
                        return <TaskItem key={"task" + task.pk} navigationTask={task}/>
                    })}

                </ul>
            </div>
        </div>
    }
}


