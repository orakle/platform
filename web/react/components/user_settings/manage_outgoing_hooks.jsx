// Copyright (c) 2015 Spinpunch, Inc. All Rights Reserved.
// See License.txt for license information.

var Client = require('../../utils/client.jsx');
var Constants = require('../../utils/constants.jsx');
var ChannelStore = require('../../stores/channel_store.jsx');
var LoadingScreen = require('../loading_screen.jsx');


export default class ManageOutgoingHooks extends React.Component {
    constructor() {
        super();

        this.getHooks = this.getHooks.bind(this);
        this.addNewHook = this.addNewHook.bind(this);
        this.updateChannelId = this.updateChannelId.bind(this);
        this.updateTriggerWords = this.updateTriggerWords.bind(this);
        this.updateCallbackURLs = this.updateCallbackURLs.bind(this);

        this.state = {hooks: [], channelId: '', triggerWords: '', callbackURLs: '', getHooksComplete: false};
    }
    componentDidMount() {
        this.getHooks();
    }
    addNewHook(e) {
        e.preventDefault();

        if ((this.state.channelId === '' && this.state.triggerWords === '') ||
                this.state.callbackURLs === '') {
            return;
        }

        const hook = {};
        hook.channel_id = this.state.channelId;
        if (this.state.triggerWords.length !== 0) {
            hook.trigger_words = this.state.triggerWords.trim().split(',');
        }
        hook.callback_urls = this.state.callbackURLs.split('\n');

        Client.addOutgoingHook(
            hook,
            (data) => {
                let hooks = Object.assign([], this.state.hooks);
                if (!hooks) {
                    hooks = [];
                }
                hooks.push(data);
                this.setState({hooks, serverError: null, channelId: '', triggerWords: '', callbackURLs: ''});
            },
            (err) => {
                this.setState({serverError: err});
            }
        );
    }
    removeHook(id) {
        const data = {};
        data.id = id;

        Client.deleteOutgoingHook(
            data,
            () => {
                const hooks = this.state.hooks;
                let index = -1;
                for (let i = 0; i < hooks.length; i++) {
                    if (hooks[i].id === id) {
                        index = i;
                        break;
                    }
                }

                if (index !== -1) {
                    hooks.splice(index, 1);
                }

                this.setState({hooks});
            },
            (err) => {
                this.setState({serverError: err});
            }
        );
    }
    regenToken(id) {
        const regenData = {};
        regenData.id = id;

        Client.regenOutgoingHookToken(
            regenData,
            (data) => {
                const hooks = Object.assign([], this.state.hooks);
                for (let i = 0; i < hooks.length; i++) {
                    if (hooks[i].id === id) {
                        hooks[i] = data;
                        break;
                    }
                }

                this.setState({hooks, serverError: null});
            },
            (err) => {
                this.setState({serverError: err});
            }
        );
    }
    getHooks() {
        Client.listOutgoingHooks(
            (data) => {
                if (data) {
                    this.setState({hooks: data, getHooksComplete: true, serverError: null});
                }
            },
            (err) => {
                this.setState({serverError: err});
            }
        );
    }
    updateChannelId(e) {
        this.setState({channelId: e.target.value});
    }
    updateTriggerWords(e) {
        this.setState({triggerWords: e.target.value});
    }
    updateCallbackURLs(e) {
        this.setState({callbackURLs: e.target.value});
    }
    render() {
        let serverError;
        if (this.state.serverError) {
            serverError = <label className='has-error'>{this.state.serverError}</label>;
        }

        const channels = ChannelStore.getAll();
        const options = [];
        options.push(
            <option
                key='select-channel'
                value=''
            >
                {'--- Select a channel ---'}
            </option>
        );

        channels.forEach((channel) => {
            if (channel.type === Constants.OPEN_CHANNEL) {
                options.push(
                    <option
                        key={'outgoing-hook' + channel.id}
                        value={channel.id}
                    >
                        {channel.display_name}
                    </option>
                );
            }
        });

        const hooks = [];
        this.state.hooks.forEach((hook) => {
            const c = ChannelStore.get(hook.channel_id);

            if (!c && hook.channel_id && hook.channel_id.length !== 0) {
                return;
            }

            let channelDiv;
            if (c) {
                channelDiv = (
                    <div className='padding-top'>
                        <strong>{'Channel: '}</strong>{c.display_name}
                    </div>
                );
            }

            let triggerDiv;
            if (hook.trigger_words && hook.trigger_words.length !== 0) {
                triggerDiv = (
                    <div className='padding-top'>
                        <strong>{'Trigger Words: '}</strong>{hook.trigger_words.join(', ')}
                    </div>
                );
            }

            hooks.push(
                <div
                    key={hook.id}
                    className='webhook__item'
                >
                    <div className='padding-top x2'>
                        <strong>{'URLs: '}</strong><span className='word-break--all'>{hook.callback_urls.join(', ')}</span>
                    </div>
                    {channelDiv}
                    {triggerDiv}
                    <div className='padding-top'>
                        <strong>{'Token: '}</strong>{hook.token}
                    </div>
                    <div className='padding-top'>
                        <a
                            className='text-danger'
                            href='#'
                            onClick={this.regenToken.bind(this, hook.id)}
                        >
                            {'Regen Token'}
                        </a>
                        <a
                            className='webhook__remove'
                            href='#'
                            onClick={this.removeHook.bind(this, hook.id)}
                        >
                            <span aria-hidden='true'>{'×'}</span>
                        </a>
                    </div>
                    <div className='padding-top x2 divider-light'></div>
                </div>
            );
        });

        let displayHooks;
        if (!this.state.getHooksComplete) {
            displayHooks = <LoadingScreen/>;
        } else if (hooks.length > 0) {
            displayHooks = hooks;
        } else {
            displayHooks = <div className='padding-top x2'>{'None'}</div>;
        }

        const existingHooks = (
            <div className='webhooks__container'>
                <label className='control-label padding-top x2'>{'Existing outgoing webhooks'}</label>
                <div className='padding-top divider-light'></div>
                <div className='webhooks__list'>
                    {displayHooks}
                </div>
            </div>
        );

        const disableButton = (this.state.channelId === '' && this.state.triggerWords === '') || this.state.callbackURLs === '';

        return (
            <div key='addOutgoingHook'>
                <label className='control-label'>{'Add a new outgoing webhook'}</label>
                <div className='padding-top divider-light'></div>
                <div className='padding-top'>
                    <div>
                        <label className='control-label'>{'Channel'}</label>
                        <div className='padding-top'>
                            <select
                                ref='channelName'
                                className='form-control'
                                value={this.state.channelId}
                                onChange={this.updateChannelId}
                            >
                                {options}
                            </select>
                        </div>
                        <div className='padding-top'>{'Only public channels can be used'}</div>
                    </div>
                    <div className='padding-top x2'>
                        <label className='control-label'>{'Trigger Words:'}</label>
                        <div className='padding-top'>
                            <input
                                ref='triggerWords'
                                className='form-control'
                                value={this.state.triggerWords}
                                onChange={this.updateTriggerWords}
                                placeholder='Optional if channel selected'
                            />
                        </div>
                        <div className='padding-top'>{'Comma separated words to trigger on'}</div>
                    </div>
                    <div className='padding-top x2'>
                        <label className='control-label'>{'Callback URLs:'}</label>
                        <div className='padding-top'>
                        <textarea
                            ref='callbackURLs'
                            className='form-control no-resize'
                            value={this.state.callbackURLs}
                            resize={false}
                            rows={3}
                            onChange={this.updateCallbackURLs}
                        />
                        </div>
                        <div className='padding-top'>{'New line separated URLs that will receive the HTTP POST event'}</div>
                        {serverError}
                    </div>
                    <div className='padding-top padding-bottom'>
                        <a
                            className={'btn btn-sm btn-primary'}
                            href='#'
                            disabled={disableButton}
                            onClick={this.addNewHook}
                        >
                            {'Add'}
                        </a>
                    </div>
                </div>
                {existingHooks}
            </div>
        );
    }
}
