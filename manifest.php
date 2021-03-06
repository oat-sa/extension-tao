<?php

/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2018 (original work) Open Assessment Technologies SA (under the project TAO-PRODUCT);
 *
 */

use oat\taoQtiTestPreviewer\scripts\update\Updater;
use oat\taoQtiTestPreviewer\scripts\install\RegisterPreviewers;
use oat\taoQtiTestPreviewer\scripts\install\RegisterTestPreviewer;
use oat\taoItems\model\ontology\ItemAuthorRole;

return [
    'name' => 'taoQtiTestPreviewer',
    'label' => 'extension-tao-testqti-previewer',
    'description' => 'extension that provides QTI test previewer',
    'license'     => 'GPL-2.0',
    'author' => 'Open Assessment Technologies SA',
    'managementRole' => 'http://www.tao.lu/Ontologies/TAOTest.rdf#TaoQtiTestPreviewerRole',
    'acl' => [
        ['grant', 'http://www.tao.lu/Ontologies/TAOTest.rdf#TaoQtiTestPreviewerRole', ['ext' => 'taoQtiTestPreviewer']],
        ['grant', ItemAuthorRole::INSTANCE_URI, ['ext' => 'taoQtiTestPreviewer', 'mod' => 'Previewer']],
    ],
    'install' => [
        'php' => [
            RegisterPreviewers::class,
            RegisterTestPreviewer::class
        ],
        'rdf' => [
            __DIR__ . '/install/ontology/previewerRole.rdf',
        ],
    ],
    'update' => Updater::class,
    'uninstall' => [
    ],
    'routes' => [
        '/taoQtiTestPreviewer' => 'oat\\taoQtiTestPreviewer\\controller'
    ],
    'constants' => [
        # views directory
        'DIR_VIEWS' => __DIR__ . DIRECTORY_SEPARATOR . 'views' . DIRECTORY_SEPARATOR,

        #BASE URL (usually the domain root)
        'BASE_URL'  => ROOT_URL . 'taoQtiTestPreviewer/',
    ],
    'extra' => [
        'structures' => __DIR__ . DIRECTORY_SEPARATOR . DIRECTORY_SEPARATOR . 'structures.xml',
    ]
];
