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
	"errors"
	"io/ioutil"
	"path/filepath"
	"strings"
	"testing"
)

func TestLicenseLinter_glob(t *testing.T) {
	f, err := glob("./__license__", G{
		FileFilter: func(root string) bool {
			return filepath.Ext(root) == ".go"
		},
	})

	if err != nil {
		t.Fatalf("glob error: %v", err)
	}

	if len(f) == 0 {
		t.Fatalf("glob error: %v", errors.New("no files"))
	}
}

func TestLicenseLinter_lint(t *testing.T) {
	l := LicenseLinter{
		Dir: "./__license__",
		g: G{
			FileFilter: func(root string) bool {
				return filepath.Ext(root) == ".go"
			},
		},
	}

	files, err := l.lint()
	if err != nil {
		t.Fatalf("lint error: %v", err)
	}

	if len(files) == 0 {
		t.Fatalf("lint error: %v", files)
	}
}

func TestLicenseLinter_fix(t *testing.T) {
	// write test data
	ioutil.WriteFile("./__license__/fix.go", []byte("package main"), 0644)
	ioutil.WriteFile("./__license__/fix.js", []byte("console.log('hello');"), 0644)
	ioutil.WriteFile("./__license__/fix.ts", []byte("console.log('hello');"), 0644)
	ioutil.WriteFile("./__license__/fix.sh", []byte("echo 'hello'"), 0644)
	ioutil.WriteFile("./__license__/fix.yml", []byte(`version: 1`), 0644)
	ioutil.WriteFile("./__license__/Makefile", []byte(``), 0644)
	ioutil.WriteFile("./__license__/.npmignore", []byte(``), 0644)
	ioutil.WriteFile("./__license__/fix.java", []byte(`public class fix {}`), 0644)
	ioutil.WriteFile("./__license__/fix.xml", []byte(`<project></project>`), 0644)
	ioutil.WriteFile("./__license__/fix_head.xml", []byte(`<?xml version="1.0" encoding="UTF-8"?><project></project>`), 0644)

	l := &LicenseLinter{
		Dir: "./__license__",
		g: G{
			FileFilter: func(root string) bool {
				return strings.Contains(root, "fix")
			},
		},
	}

	err := l.fix()
	if err != nil {
		t.Fatalf("fix error: %v", err)
	}

	// read test data
	files, err := l.lint()
	if err != nil {
		t.Fatalf("lint error: %v", err)
	}

	// check file
	if len(files) != 0 {
		t.Fatalf("lint error: %v", files)
	}
}
