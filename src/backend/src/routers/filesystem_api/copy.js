/*
 * Copyright (C) 2024-present Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
"use strict"
const eggspress = require('../../api/eggspress.js');
const FSNodeParam = require('../../api/filesystem/FSNodeParam.js');
const { HLCopy } = require('../../filesystem/hl_operations/hl_copy.js');
const { Context } = require('../../util/context.js');

// -----------------------------------------------------------------------//
// POST /copy
// -----------------------------------------------------------------------//
module.exports = eggspress('/copy', {
    subdomain: 'api',
    auth2: true,
    verified: true,
    fs: true,
    json: true,
    allowedMethods: ['POST'],
    parameters: {
        source: new FSNodeParam('source'),
        destination: new FSNodeParam('destination'),
    }
}, async (req, res) => {
    const user           = req.user
    const dedupe_name    =
        req.body.dedupe_name ??
        req.body.change_name ?? false;

    let frame;
    {
        const x = Context.get();
        const operationTraceSvc = x.get('services').get('operationTrace');
        frame = (await operationTraceSvc.add_frame('api:/copy'))
            .attr('gui_metadata', {
                original_client_socket_id: req.body.original_client_socket_id,
                socket_id: req.body.socket_id,
                operation_id: req.body.operation_id,
                user_id: req.user.id,
                item_upload_id: req.body.item_upload_id,
            })
            ;
        x.set(operationTraceSvc.ckey('frame'), frame);
    }

    const tracer = req.services.get('traceService').tracer;
    await tracer.startActiveSpan('filesystem_api.copy', async span => {

        // === upcoming copy behaviour ===
        const hl_copy = new HLCopy();
        const response = await hl_copy.run({
            destination_or_parent: req.values.destination,
            source: req.values.source,
            new_name: req.body.new_name,

            overwrite: req.body.overwrite ?? false,
            dedupe_name,

            user: user,
        });

        span.end();
        frame.done();
        return res.send([ response ]);
    });

    // res.send(new_fsentries)
});
