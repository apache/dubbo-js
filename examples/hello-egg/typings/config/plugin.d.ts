// This file is created by egg-ts-helper@1.25.6
// Do not modify this file!!!!!!!!!

import 'egg';
import 'egg-development';
import 'egg-i18n';
import 'egg-jsonp';
import 'egg-logrotator';
import 'egg-multipart';
import 'egg-onerror';
import 'egg-schedule';
import 'egg-security';
import 'egg-session';
import 'egg-static';
import 'egg-view';
import 'egg-watcher';
declare module 'egg' {
  interface EggPlugin {
    onerror?: EggPluginItem;
    session?: EggPluginItem;
    i18n?: EggPluginItem;
    watcher?: EggPluginItem;
    multipart?: EggPluginItem;
    security?: EggPluginItem;
    development?: EggPluginItem;
    logrotator?: EggPluginItem;
    schedule?: EggPluginItem;
    static?: EggPluginItem;
    jsonp?: EggPluginItem;
    view?: EggPluginItem;
  }
}
