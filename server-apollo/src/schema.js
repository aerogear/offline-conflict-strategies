const { gql } = require('apollo-server')
const { makeExecutableSchema } = require('graphql-tools')
const { GraphQLNonNull } = require('graphql')
const { combineResolvers, pipeResolvers } = require('graphql-resolvers')

const typeDefs = gql`
type User {
  id: ID!
  name: String!
  dateOfBirth: String!
  version: Int
}

type Query {
  allUsers: [User],
  allUsersPaginated(first: Int): [User],
  getUser(id: ID!): User
}

type Mutation {
  createUser(name: String!, dateOfBirth: String!): User
  updateUser(id: ID!, name: String, dateOfBirth: String, version: Int!): User
  deleteUser(id: ID!): User
}
`

// Resolvers define the technique for fetching the types in the
// schema.
const resolvers = {
  Query: {
    allUsers: async (obj, args, context) => {
      const result = await context.db.select().from('users')
      return result
    },
    allUsers: async (obj, args, context) => {
      const result = await context.db.select().from('users')
      return result
    },
    getUser: async (obj, args, context, info) => {
      const result = await context.db.select().from('users').where('id', args.id).then((rows) => rows[0])
      return result
    }
  },

  Mutation: {
    createUser: async (obj, args, context, info) => {
      const result = await context.db('users').insert({ ...args, version: 1 }).returning('*').then((rows) => rows[0])
      return result
    },
    updateUser: async (obj, args, context, info) => {
      let { id, version, ...updateArgs } = args
      const currentRecord = await context.db('users').select().where('id', args.id).then((rows) => rows[0])
      if (!currentRecord) return null // or not found error??

      const conflict = context.detectConflict(currentRecord, args) // detect conflict
      
      if (conflict) {
        const resolvedResult = context.handleConflict(context.conflictHandlers.RETURN_TO_CLIENT, conflict, currentRecord, args) 
      }

      const result = await context.db('users').update({ ...updateArgs, version: currentRecord.version + 1 }).where({'id': id }).returning('*').then((rows) => rows[0])
      return result
    },
    deleteUser: async (obj, args, context, info) => {
      const result = await context.db('users').delete().where('id', args.id).returning('*').then((rows) => rows[0])
      return result
    }
  }
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

module.exports = schema
