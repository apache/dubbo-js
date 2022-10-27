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
	"path/filepath"
	"strings"
	"sync"
)

type LicenseLinter struct {
	Dir string
	g   G
}

func (l *LicenseLinter) lint() ([]string, error) {
	var errFiles []string
	// glob files
	files, err := glob(l.Dir, l.g)
	if err != nil {
		return nil, err
	}

	// check license
	var wg sync.WaitGroup
	ch := make(chan string)

	for _, f := range files {
		wg.Add(1)
		go func(f string) {
			defer wg.Done()
			b, err := os.ReadFile(f)
			if err != nil {
				panic(err)
			}
			if !strings.Contains(string(b), "http://www.apache.org/licenses/LICENSE-2.0") {
				ch <- f
			}
		}(f)
	}

	go func() {
		wg.Wait()
		close(ch)
	}()

	for s := range ch {
		errFiles = append(errFiles, s)
	}

	return errFiles, nil
}

func (l *LicenseLinter) fix() error {
	var wg sync.WaitGroup
	files, err := l.lint()
	if err != nil {
		return err
	}

	for _, f := range files {
		wg.Add(1)
		go func(f string) {
			defer wg.Done()
			err := l.fix_file(f)
			if err != nil {
				panic(err)
			}
		}(f)
	}

	wg.Wait()
	return nil
}

func (l *LicenseLinter) fix_file(f string) error {
	if !license.support(f) {
		return nil
	}

	// read file
	b, err := os.ReadFile(f)
	if err != nil {
		panic(err)
	}
	s := string(b)

	// xml with header
	ext := filepath.Ext(f)
	x := `<?xml version="1.0" encoding="UTF-8"?>`
	if ext == ".xml" && strings.Contains(s, x) {
		nx := strings.Replace(s, x, x+"\n\n"+license.get(f)+"\n\n", 1)
		if err := os.WriteFile(f, []byte(nx), 0644); err != nil {
			return err
		}
	} else {
		// common
		if err := os.WriteFile(f, []byte(fmt.Sprintf("%s\n\n%s", license.get(f), b)), 0644); err != nil {
			return err
		}
	}
	return nil
}
