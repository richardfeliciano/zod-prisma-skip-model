import { PrismaOptions, configSchema } from './config'
import { generateBarrelFile, populateModelFile } from './generator'

import { Project } from 'ts-morph'
import { SemicolonPreference } from 'typescript'
import { generatorHandler } from '@prisma/generator-helper'
// @ts-ignore Importing package.json for automated synchronization of version numbers
import { version } from '../package.json'

generatorHandler({
	onManifest() {
		return {
			version,
			prettyName: 'Zod Schemas',
			defaultOutput: 'zod',
		}
	},
	onGenerate(options) {
		const project = new Project()

		const models = options.dmmf.datamodel.models

		const { schemaPath } = options
		const outputPath = options.generator.output!.value
		const clientPath = options.otherGenerators.find(
			(each) => each.provider.value === 'prisma-client-js'
		)!.output!.value!

		const results = configSchema.safeParse(options.generator.config)
		if (!results.success)
			throw new Error(
				'Incorrect config provided. Please check the values you provided and try again.'
			)

		const config = results.data

		const prismaOptions: PrismaOptions = {
			clientPath,
			outputPath,
			schemaPath,
		}

		const indexFile = project.createSourceFile(
			`${outputPath}/index.ts`,
			{},
			{ overwrite: true }
		)

		generateBarrelFile(models, indexFile, config.skipModels)

		indexFile.formatText({
			indentSize: 2,
			convertTabsToSpaces: true,
			semicolons: SemicolonPreference.Remove,
		})

		models.filter(model => !config.skipModels.includes(model.name)).forEach((model) => {
			const sourceFile = project.createSourceFile(
				`${outputPath}/${model.name.toLowerCase()}.ts`,
				{},
				{ overwrite: true }
			)

			populateModelFile(model, sourceFile, config, prismaOptions)

			sourceFile.formatText({
				indentSize: 2,
				convertTabsToSpaces: true,
				semicolons: SemicolonPreference.Remove,
			})
		})

		return project.save()
	},
})
