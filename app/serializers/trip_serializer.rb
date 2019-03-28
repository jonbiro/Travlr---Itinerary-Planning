class TripSerializer < ActiveModel::Serializer
  attributes :id, :destination, :places
  has_many :cities
  # has_many :places,through: :cities
end
