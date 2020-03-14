/**
 * @todo
 * Actually implement this script.
 *
 * @description
 * This script anonymizes the data backed up from the `default` database 
 * partition for use in the `test` database partition (during development). As
 * specified in our [Privacy Policy]{@link https://tutorbook.app/legal#privacy},
 * we **always** anonymize data for development purposes.
 *
 * @usage
 * First, change `INPUT` and `OUTPUT` to the filenames of your `default` 
 * database backup and the desired `test` database backup location respectively.
 * Then, just run (to generate your anonymized data for your `test` partition):
 * 
 * ```
 * $ node anonymize.js
 * ```
 *
 * @license
 * Copyright (C) 2020 Tutorbook
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
 * FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see {@link https://www.gnu.org/licenses/}.
 */

const INPUT = './default.json';
const OUTPUT = './test.json';