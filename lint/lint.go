/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package main

import (
	"fmt"
	"os"
	"regexp"
	"time"
)

var (
	//skip dir
	rx          = regexp.MustCompile("node_modules|vendor|lib|target|__license__|__notice__|husky|.vitepress")
	ignore_file = regexp.MustCompile(".eslintrc.js|pnpm-lock.yaml")
	license     = NewLicense()
	// lint notice
	nl = &NoticeLinter{File: "./NOTICE"}
	// lint license
	ll = &LicenseLinter{
		Dir: "./",
		g: G{
			DirFilter: func(path string) bool {
				return !rx.MatchString(path)
			},
			FileFilter: func(path string) bool {
				return !ignore_file.MatchString(path) && license.support(path)
			},
		},
	}
)

// fix_one fix single file
func fix_one(nl *NoticeLinter, ll *LicenseLinter, f string) {
	now := time.Now()

	if f == "NOTICE" {
		// fix notice
		if err := nl.fix(); err != nil {
			fmt.Fprint(os.Stderr, err)
		}
	} else {
		// fixed license
		if err := ll.fix_file(f); err != nil {
			fmt.Fprint(os.Stderr, err)
		}
	}

	fmt.Println(warn(fmt.Sprintf("fix cost: %v", time.Since(now))))
}

// fix_all fix all file
func fix_all(nl *NoticeLinter, ll *LicenseLinter) {
	now := time.Now()

	// fix notice
	if err := nl.fix(); err != nil {
		fmt.Fprint(os.Stderr, err)
	}

	// fixed license
	if err := ll.fix(); err != nil {
		fmt.Fprint(os.Stderr, err)
	}

	fmt.Println(warn(fmt.Sprintf("fix cost: %v", time.Since(now))))
}

// lint lint all file
func lint(nl *NoticeLinter, ll *LicenseLinter) {
	now := time.Now()
	var err error

	// lint mode
	if err = nl.lint(); err != nil {
		fmt.Fprintln(os.Stderr, failed(err.Error()))
	}

	// check license
	files, err := ll.lint()
	if err != nil {
		fmt.Fprintln(os.Stderr, failed(err.Error()))
	}

	for _, f := range files {
		fmt.Fprintln(os.Stdout, failed(fmt.Sprintf("%s => lose apache license", f)))
	}

	fmt.Println(success(fmt.Sprintf("lint cost: %v", time.Since(now))))

	if err != nil {
		fmt.Println("you can use ./dj_lint -fix all")
		panic(err)
	}
}
