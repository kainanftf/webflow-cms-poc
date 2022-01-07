require("dotenv").config();

const config = {
  webflow: require("webflow-api"),
  get api() {
    return new this.webflow({
      token: `${process.env.WEBFLOW_TOKEN}`,
    });
  },
  baseCollectionConfig: {
    collectionId: `${process.env.POKE_COLLECTION_ID}`,
  },
};

(async function main() {
  const { api, baseCollectionConfig } = config;
  const { items: existingWebflowPokemon, count: existingWebflowPokemonLength } =
    await (await api.collection(baseCollectionConfig)).items();

  if (existingWebflowPokemonLength > 0)
    await clearWebflowExistingPokemon(existingWebflowPokemon);

  const incomingPokemon = await getPokemon();
  if (incomingPokemon.length > 0)
    setTimeout(() => createNewWebflowPokemon(incomingPokemon), 8000);
  /* 
      api.publishSite(invoked in clearWebflowExistingPokemon()) only enqueues the site to be published
      the response is a "queued" boolean so we dont actually know when the site finishes publishing
      this creates a race condition where if createNewWebflowPokemon() runs before the site publishes
      we get an error, hence the large setTimeout()...I imagine we would be more creative for non POC code
    */
})();

async function getPokemon() {
  const resp = await fetch("https://pokeapi.co/api/v2/pokemon?limit=10");
  const data = await resp.json();

  const pokemon = data.results;

  return await Promise.all(
    pokemon.map(async (pokemon) => {
      const resp = await fetch(pokemon.url);
      return await resp.json();
    })
  );
}

async function clearWebflowExistingPokemon(pokemons) {
  const { api, baseCollectionConfig } = config;

  for (const pokemon of pokemons) {
    await api.removeItem({ ...baseCollectionConfig, itemId: pokemon["_id"] });
  }

  await api.publishSite({
    siteId: "61d4984de08f8b4c1a238dbc",
    domains: ["kainans-api-tester.webflow.io"],
  });
}

async function createNewWebflowPokemon(pokemons) {
  const { api, baseCollectionConfig } = config;

  for (const pokemon of pokemons) {
    const fields = {
      name: pokemon.name,
      slug: pokemon.name,
      image: pokemon.sprites.front_default,
      _archived: false,
      _draft: false,
    };

    await api.createItem({ ...baseCollectionConfig, fields }, { live: true });
  }
}
