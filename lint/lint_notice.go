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
	"io/ioutil"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// NoticeLinter check notice file end year
type NoticeLinter struct {
	File string
}

func parseYear(file string) (string, error) {
	// read notice file
	b, err := ioutil.ReadFile(file)
	if err != nil {
		return "", fmt.Errorf("read %s error %s", file, err)
	}

	// find match date-range string
	re := regexp.MustCompile(`2018-(\d{4})`)
	g := re.FindStringSubmatch(string(b))
	if len(g) == 0 {
		return "", fmt.Errorf("match date-range error")
	}

	// return end year
	return g[1], nil
}

func (n *NoticeLinter) lint() error {
	y, err := parseYear(n.File)
	if err != nil {
		return err
	}

	// convert
	v, err := strconv.Atoi(y)
	if err != nil {
		return err
	}

	// lint
	year := time.Now().Year()
	if v != year {
		return fmt.Errorf("NOTICE file err => end year %d != %d", v, year)
	}

	return nil
}

func (n *NoticeLinter) fix() error {
	// parse end year
	y, err := parseYear(n.File)
	if err != nil {
		return err
	}

	// read file content
	b, err := ioutil.ReadFile(n.File)
	if err != nil {
		return err
	}

	// replace with current year
	s := strings.Replace(string(b), y, strconv.Itoa(time.Now().Year()), 0644)
	if err := ioutil.WriteFile(n.File, []byte(s), 0644); err != nil {
		return err
	}

	return nil
}
