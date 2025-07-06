import { JwtService } from '@nestjs/jwt';

/**
 * ### JWTListingPlugin
 *
 * Swagger plugin that lists a couple of JWTTokens as buttons.
 * @author      MichValwin
 * @license     Apache 2.0
 * @see         [pluginApi](https://swagger.io/docs/open-source-tools/swagger-ui/customization/plugin-api/)
 */
export const JWTListingPlugin = {
    statePlugins: {
        spec: {
            selectors: {
                customTokens: (state) => {
                    const spec = state.get('json');
                    return spec.get('x-custom-tokens');
                },
            },
        },
    },
    wrapComponents: {
        authorizeBtn: (Original, system) => (props) => {
            const decodeJWT = (token) => {
                try {
                    const parts = token.split('.');
                    if (parts.length !== 3) return null;

                    // Decode the payload (second part)
                    const base64Url = parts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(window.atob(base64));

                    // Calculate remaining time:
                    const currentTime = Math.floor(Date.now() / 1000); // Current time sec.
                    payload.isExpired = payload.exp && payload.exp < currentTime;
                    payload.expiresIn = payload.isExpired ? 0 : payload.exp - currentTime;
                    payload.issuedAt = new Date(payload.iat * 1000).toISOString();

                    return payload;
                } catch (e) {
                    console.error('Error decoding JWT:', e);
                    return null;
                }
            };

            // Parse token ordered map
            const tokens = system.specSelectors.customTokens();
            const tokensArray = tokens.toArray();
            const tokensParsed: Array<{ name: string; token: string }> = [];
            tokensArray.forEach((orderedMap) => {
                const tokenInfo = {
                    name: orderedMap.get('name'),
                    token: orderedMap.get('token'),
                };
                tokensParsed.push(tokenInfo);
            });

            // Get current authorization token
            const securityDefinitions = system.authSelectors.authorized();
            let currentToken = null;
            securityDefinitions.forEach((definition, key) => {
                if (key === 'bearer') currentToken = definition.get('value');
            });
            let decToken: any = null;
            if (currentToken) decToken = decodeJWT(currentToken);

            const elements: any[] = [];

            tokensParsed.forEach((token) => {
                const isCurrentToken = currentToken === token.token;
                if (isCurrentToken) {
                    console.log('Custom token selected:');
                    console.log(decToken);
                }

                const button = system.React.createElement(
                    'button',
                    {
                        className: isCurrentToken ? 'btn authorize' : 'btn',
                        style: { marginRight: '10px', marginBottom: '10px' },
                        onClick: () => {
                            // Get scheme of auth
                            const securityDefinitions = system.specSelectors.securityDefinitions();
                            let bearerAuthKey = null;
                            securityDefinitions.forEach((definition, key) => {
                                if (definition.get('type') === 'http' && definition.get('scheme') === 'Bearer') {
                                    bearerAuthKey = key;
                                }
                            });
                            if (!bearerAuthKey) {
                                console.error('No bearer auth scheme found in spec');
                                return;
                            }

                            // Get schema for auth
                            const schema = securityDefinitions.get(bearerAuthKey);

                            const auth = {
                                [bearerAuthKey]: {
                                    value: token.token,
                                    schema: schema,
                                },
                            };

                            // Configure and authorize
                            system.authActions.configureAuth(auth);
                            system.authActions.authorizeWithPersistOption(auth);
                        },
                    },
                    `${token.name}`,
                );
                elements.push(button);
            });

            // Get info from current JWT cookie if exists
            let parsedToken = '';
            let parsedTokenElement = undefined;
            if (decToken) {
                const keyValues: string[] = [];
                for (const k in decToken) {
                    // Parse token info, except for iat & exp
                    if (k != 'iat' && k != 'exp' && k != 'expiresIn' && k != 'isExpired' && k != 'issuedAt') keyValues.push(`${k}:${decToken[k]}`);
                }
                parsedToken = keyValues.join(', ');

                // To give it a green color if token is valid or red if its invalid
                const styleClass = decToken.isExpired ? 'swagger-ui opblock opblock-delete opblock-summary' : 'swagger-ui opblock opblock-post opblock-summary';

                // Create active token element
                parsedTokenElement = system.React.createElement(
                    'div',
                    {
                        style: { padding: '5px' },
                        class: styleClass,
                    },
                    parsedToken,
                );
            }

            // Create React state for visibility
            const [isUserButtonsVisible, setUserButtonsVisible] = system.React.useState(true);
            // Toggle button
            const toggleButton = system.React.createElement(
                'button',
                {
                    className: 'btn',
                    style: {
                        cursor: 'pointer',
                    },
                    onClick: () => setUserButtonsVisible(!isUserButtonsVisible),
                },
                isUserButtonsVisible ? '^' : 'v',
            );

            // User buttons container with toggle
            const userButtonsContainer = system.React.createElement(
                'div',
                {
                    style: {
                        marginBottom: '1em',
                    },
                },
                [
                    toggleButton,
                    isUserButtonsVisible &&
                        system.React.createElement(
                            'div',
                            {
                                style: {
                                    marginTop: '5px',
                                    display: isUserButtonsVisible ? 'block' : 'none',
                                },
                            },
                            elements,
                        ),
                ],
            );

            // Expiration time of current token
            const infoExp = `Expiration time: ${decToken?.expiresIn}, isExpired: ${decToken?.isExpired}, issuedAt: ${decToken?.issuedAt}`;
            const tokenExpirationCont = system.React.createElement(
                'div',
                {
                    style: { padding: '5px' },
                    class: '',
                },
                infoExp,
            );

            // All UI elements
            const UIElements = [
                // Original authorize button
                system.React.createElement(
                    'div',
                    {
                        style: {
                            marginBottom: '1em',
                        },
                    },
                    system.React.createElement(Original, props),
                ),
                // User buttons
                userButtonsContainer,
                // Parsed token
                parsedTokenElement,
                // Token expiration
                tokenExpirationCont,
            ];

            // Insert UIElements
            return system.React.createElement('div', { style: { width: '100%' } }, UIElements);
        },
    },
};

/**
 * Builds and signs all the tokens to list for the plugin.
 *
 * @param jwtService
 * @param jwtSecret
 * @param usersInfo
 * @returns
 */
export function buildAuthTokensSwagger(jwtService: JwtService, jwtSecret: string, usersInfo: any[]): Array<{ name: string; token: string }> {
    const customTokens = usersInfo.map((user) => {
        const token = {
            name: user.name,
            token: jwtService.sign(user, { secret: jwtSecret }),
        };
        return token;
    });
    return customTokens;
}
