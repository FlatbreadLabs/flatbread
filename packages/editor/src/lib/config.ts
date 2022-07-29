import fs from 'node:fs/promises';
import path from 'node:path';
import { isEqual, mapValues, merge } from 'lodash-es';
import yaml from 'js-yaml';
import crypto from 'node:crypto';

function replacer(key, value) {
	if (key === 'type') return undefined;
	if (value === null) return undefined;
	if (key === 'readOnly' && value === false) return undefined;
	return value;
}

export default class Config {
	static getPath(schema) {
		return path.resolve(
			process.cwd(),
			'.flatbread',
			'schemas',
			`${schema.schema.name
				.replace(/([A-Z])/g, '-$1')
				.replace(/^\-/, '')
				.toLowerCase()}.yaml`
		);
	}
	static async exists(schema: string) {
		try {
			return await fs.stat(this.getPath(schema));
		} catch (e) {
			console.log('does not exist');
			return false;
		}
	}

	static async get(collectionName: string, schema) {
		let existing;
		let filePath = this.getPath(schema);
		if (await this.exists(schema)) {
			const file = await fs.readFile(filePath, 'utf-8');
			existing = yaml.load(file);
			merge(schema, existing);
		} else {
			await fs.mkdir(path.dirname(filePath), { recursive: true });
		}

		const meta = schema.meta ?? {};
		schema.meta = undefined;
		meta.hash = crypto.createHmac('sha1', String(schema)).digest('base64');
		schema.meta = meta;

		if (!isEqual(existing?.meta?.hash, schema?.meta?.hash)) {
			console.log('writing config', collectionName);

			await fs.writeFile(
				filePath,
				yaml.dump(schema, {
					flowLevel: 3,
					replacer
				}),
				'utf-8'
			);
		}

		return schema;
	}
}
