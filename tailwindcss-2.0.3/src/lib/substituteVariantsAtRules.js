import _ from 'lodash'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import generateVariantFunction from '../util/generateVariantFunction'
import prefixSelector from '../util/prefixSelector'
import buildSelectorVariant from '../util/buildSelectorVariant'

function generatePseudoClassVariant(pseudoClass, selectorPrefix = pseudoClass) {
  return generateVariantFunction(({ modifySelectors, separator }) => {
    const parser = selectorParser((selectors) => {
      selectors.walkClasses((sel) => {
        sel.value = `${selectorPrefix}${separator}${sel.value}`
        sel.parent.insertAfter(sel, selectorParser.pseudo({ value: `:${pseudoClass}` }))
      })
    })

    return modifySelectors(({ selector }) => parser.processSync(selector))
  })
}

function ensureIncludesDefault(variants) {
  return variants.includes('DEFAULT') ? variants : ['DEFAULT', ...variants]
}

const defaultVariantGenerators = (config) => ({
  DEFAULT: generateVariantFunction(() => {}),
  dark: generateVariantFunction(
    ({ container, separator, modifySelectors }) => {
      if (config.darkMode === false) {
        return postcss.root()
      }

      if (config.darkMode === 'media') {
        const modified = modifySelectors(({ selector }) => {
          return buildSelectorVariant(selector, 'dark', separator, (message) => {
            throw container.error(message)
          })
        })
        const mediaQuery = postcss.atRule({
          name: 'media',
          params: '(prefers-color-scheme: dark)',
        })
        mediaQuery.append(modified)
        container.append(mediaQuery)
        return container
      }

      if (config.darkMode === 'class') {
        const modified = modifySelectors(({ selector }) => {
          return buildSelectorVariant(selector, 'dark', separator, (message) => {
            throw container.error(message)
          })
        })

        modified.walkRules((rule) => {
          rule.selectors = rule.selectors.map((selector) => {
            return `${prefixSelector(config.prefix, '.dark')} ${selector}`
          })
        })

        return modified
      }

      throw new Error("The `darkMode` config option must be either 'media' or 'class'.")
    },
    { unstable_stack: true }
  ),
  'motion-safe': generateVariantFunction(
    ({ container, separator, modifySelectors }) => {
      const modified = modifySelectors(({ selector }) => {
        return buildSelectorVariant(selector, 'motion-safe', separator, (message) => {
          throw container.error(message)
        })
      })
      const mediaQuery = postcss.atRule({
        name: 'media',
        params: '(prefers-reduced-motion: no-preference)',
      })
      mediaQuery.append(modified)
      container.append(mediaQuery)
    },
    { unstable_stack: true }
  ),
  'motion-reduce': generateVariantFunction(
    ({ container, separator, modifySelectors }) => {
      const modified = modifySelectors(({ selector }) => {
        return buildSelectorVariant(selector, 'motion-reduce', separator, (message) => {
          throw container.error(message)
        })
      })
      const mediaQuery = postcss.atRule({
        name: 'media',
        params: '(prefers-reduced-motion: reduce)',
      })
      mediaQuery.append(modified)
      container.append(mediaQuery)
    },
    { unstable_stack: true }
  ),
  'group-hover': generateVariantFunction(({ modifySelectors, separator }) => {
    const parser = selectorParser((selectors) => {
      selectors.walkClasses((sel) => {
        sel.value = `group-hover${separator}${sel.value}`
        sel.parent.insertBefore(
          sel,
          selectorParser().astSync(prefixSelector(config.prefix, '.group:hover '))
        )
      })
    })
    return modifySelectors(({ selector }) => parser.processSync(selector))
  }),
  'group-focus': generateVariantFunction(({ modifySelectors, separator }) => {
    const parser = selectorParser((selectors) => {
      selectors.walkClasses((sel) => {
        sel.value = `group-focus${separator}${sel.value}`
        sel.parent.insertBefore(
          sel,
          selectorParser().astSync(prefixSelector(config.prefix, '.group:focus '))
        )
      })
    })
    return modifySelectors(({ selector }) => parser.processSync(selector))
  }),
  hover: generatePseudoClassVariant('hover'),
  'focus-within': generatePseudoClassVariant('focus-within'),
  'focus-visible': generatePseudoClassVariant('focus-visible'),
  focus: generatePseudoClassVariant('focus'),
  active: generatePseudoClassVariant('active'),
  visited: generatePseudoClassVariant('visited'),
  disabled: generatePseudoClassVariant('disabled'),
  checked: generatePseudoClassVariant('checked'),
  first: generatePseudoClassVariant('first-child', 'first'),
  last: generatePseudoClassVariant('last-child', 'last'),
  odd: generatePseudoClassVariant('nth-child(odd)', 'odd'),
  even: generatePseudoClassVariant('nth-child(even)', 'even'),
})

function prependStackableVariants(atRule, variants, stackableVariants) {
  if (!_.some(variants, (v) => stackableVariants.includes(v))) {
    return variants
  }

  if (_.every(variants, (v) => stackableVariants.includes(v))) {
    return variants
  }

  const variantsParent = postcss.atRule({
    name: 'variants',
    params: variants.filter((v) => stackableVariants.includes(v)).join(', '),
  })
  atRule.before(variantsParent)
  variantsParent.append(atRule)
  variants = _.without(variants, ...stackableVariants)

  return variants
}

export default function (config, { variantGenerators: pluginVariantGenerators }) {
  return function (css) {
    const variantGenerators = {
      ...defaultVariantGenerators(config),
      ...pluginVariantGenerators,
    }

    const stackableVariants = Object.entries(variantGenerators)
      .filter(([_variant, { options }]) => options.unstable_stack)
      .map(([variant]) => variant)

    let variantsFound = false

    do {
      variantsFound = false
      css.walkAtRules('variants', (atRule) => {
        variantsFound = true

        let variants = postcss.list.comma(atRule.params).filter((variant) => variant !== '')

        if (variants.includes('responsive')) {
          const responsiveParent = postcss.atRule({ name: 'responsive' })
          atRule.before(responsiveParent)
          responsiveParent.append(atRule)
        }

        const remainingVariants = prependStackableVariants(atRule, variants, stackableVariants)

        _.forEach(_.without(ensureIncludesDefault(remainingVariants), 'responsive'), (variant) => {
          if (!variantGenerators[variant]) {
            throw new Error(
              `Your config mentions the "${variant}" variant, but "${variant}" doesn't appear to be a variant. Did you forget or misconfigure a plugin that supplies that variant?`
            )
          }
          variantGenerators[variant].handler(atRule, config)
        })

        atRule.remove()
      })
    } while (variantsFound)
  }
}
