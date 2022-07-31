import yaml from 'js-yaml';
import { isArray, isEqual, keyBy, merge, mergeWith } from 'lodash-es';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GqlSchema, Schema } from './types';

function replacer(key, value) {
	if (key === 'type') return undefined;
	if (value === null) return undefined;
	if (value === '') return undefined;
	if (key === 'disabled' && value === false) return undefined;
	return value;
}

// TODO: capture

export default class Config {
	static getPath(schema: GqlSchema) {
		return path.resolve(
			process.cwd(),
			'.flatbread',
			'schemas',
			`${schema.name
				.replace(/([A-Z])/g, '-$1')
				.replace(/^\-/, '')
				.toLowerCase()}.yaml`
		);
	}
	static async exists(schema: GqlSchema) {
		try {
			return await fs.stat(this.getPath(schema));
		} catch (e) {
			console.log('does not exist');
			return false;
		}
	}

	static async get(collectionName: string, schema: Schema) {
		let existing;
		let filePath = this.getPath(schema);

		//if the file exists load it and merge the fresh graphql schema into it
		if (await this.exists(schema)) {
			const file = await fs.readFile(filePath, 'utf-8');
			existing = yaml.load(file);

			schema = mergeWith(schema, existing, function (a, b) {
				if (isArray(a)) {
					const aMap = keyBy(a, 'name');
					return b.map((field) => {
						return merge(aMap[field.name], field);
					});
				}
			});
		} else {
			await fs.mkdir(path.dirname(filePath), { recursive: true });
		}

		// attach a meta tag and get an accurate hash for caching
		const meta = schema.meta ?? {};
		schema.meta = undefined;
		meta.hash = crypto.createHmac('sha1', JSON.stringify(schema)).digest('base64');
		schema.meta = meta;

		// if the hash doesn't match the file hash, update it
		if (!isEqual(existing?.meta?.hash, schema?.meta?.hash)) {
			console.log('writing config', collectionName);

			await fs.writeFile(filePath, yaml.dump(schema, { flowLevel: 3, replacer }), 'utf-8');
		}

		return schema;
	}
}
